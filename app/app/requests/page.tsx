"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageSquare, ArrowLeft, Check, X, Star, Trash2 } from "lucide-react"
import Link from "next/link"

interface SwapRequest {
  id: string
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
  message: string | null
  created_at: string
  requester_id: string
  provider_id: string
  requester: { id: string; name: string }
  provider: { id: string; name: string }
  requested_skill: { id: string; name: string }
  offered_skill: { id: string; name: string }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [ratingData, setRatingData] = useState<{ [key: string]: { rating: number; feedback: string } }>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "received"

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/signin")
      return
    }

    setCurrentUserId(user.id)

    const { data: requestsData } = await supabase
      .from("swap_requests")
      .select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(id, name),
        provider:profiles!swap_requests_provider_id_fkey(id, name),
        requested_skill:skills!swap_requests_requested_skill_id_fkey(id, name),
        offered_skill:skills!swap_requests_offered_skill_id_fkey(id, name)
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (requestsData) {
      setRequests(requestsData)
    }

    setLoading(false)
  }

  const updateRequestStatus = async (
    requestId: string,
    status: "accepted" | "rejected" | "completed" | "cancelled",
  ) => {
    const { error } = await supabase
      .from("swap_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId)

    if (!error) {
      setRequests(requests.map((r) => (r.id === requestId ? { ...r, status } : r)))
    }
  }

  const deleteRequest = async (requestId: string) => {
    const { error } = await supabase.from("swap_requests").delete().eq("id", requestId)

    if (!error) {
      setRequests(requests.filter((r) => r.id !== requestId))
    }
  }

  const submitRating = async (requestId: string, ratedUserId: string) => {
    const rating = ratingData[requestId]
    if (!rating || !currentUserId) return

    const { error } = await supabase.from("ratings").insert({
      swap_request_id: requestId,
      rater_id: currentUserId,
      rated_id: ratedUserId,
      rating: rating.rating,
      feedback: rating.feedback.trim() || null,
    })

    if (!error) {
      // Remove rating form
      setRatingData((prev) => {
        const newData = { ...prev }
        delete newData[requestId]
        return newData
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading your requests...</p>
        </div>
      </div>
    )
  }

  const receivedRequests = requests.filter((r) => r.provider_id === currentUserId)
  const sentRequests = requests.filter((r) => r.requester_id === currentUserId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default"
      case "accepted":
        return "secondary"
      case "completed":
        return "secondary"
      case "rejected":
        return "destructive"
      case "cancelled":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Swap Requests</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">Received ({receivedRequests.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {receivedRequests.length > 0 ? (
              receivedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {request.requester.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.requester.name}</CardTitle>
                          <CardDescription>
                            Wants to learn <strong>{request.requested_skill.name}</strong> in exchange for{" "}
                            <strong>{request.offered_skill.name}</strong>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.message && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => updateRequestStatus(request.id, "accepted")}>
                            <Check className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRequestStatus(request.id, "rejected")}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {request.status === "accepted" && (
                        <Button size="sm" onClick={() => updateRequestStatus(request.id, "completed")}>
                          Mark as Completed
                        </Button>
                      )}

                      {request.status === "completed" && !ratingData[request.id] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRatingData((prev) => ({
                              ...prev,
                              [request.id]: { rating: 5, feedback: "" },
                            }))
                          }
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Rate Experience
                        </Button>
                      )}
                    </div>

                    {/* Rating Form */}
                    {ratingData[request.id] && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <Select
                            value={ratingData[request.id].rating.toString()}
                            onValueChange={(value) =>
                              setRatingData((prev) => ({
                                ...prev,
                                [request.id]: { ...prev[request.id], rating: Number.parseInt(value) },
                              }))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 4, 3, 2, 1].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} Star{num !== 1 ? "s" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Feedback (Optional)</Label>
                          <Textarea
                            value={ratingData[request.id].feedback}
                            onChange={(e) =>
                              setRatingData((prev) => ({
                                ...prev,
                                [request.id]: { ...prev[request.id], feedback: e.target.value },
                              }))
                            }
                            placeholder="Share your experience..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => submitRating(request.id, request.requester.id)}>
                            Submit Rating
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRatingData((prev) => {
                                const newData = { ...prev }
                                delete newData[request.id]
                                return newData
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Received {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests received</h3>
                <p className="text-gray-600">When others request to swap skills with you, they'll appear here.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.length > 0 ? (
              sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {request.provider.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.provider.name}</CardTitle>
                          <CardDescription>
                            You want to learn <strong>{request.requested_skill.name}</strong> in exchange for{" "}
                            <strong>{request.offered_skill.name}</strong>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                        {(request.status === "pending" || request.status === "rejected") && (
                          <Button size="sm" variant="ghost" onClick={() => deleteRequest(request.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.message && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {request.status === "accepted" && (
                      <Button size="sm" onClick={() => updateRequestStatus(request.id, "completed")}>
                        Mark as Completed
                      </Button>
                    )}

                    {request.status === "completed" && !ratingData[request.id] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRatingData((prev) => ({
                            ...prev,
                            [request.id]: { rating: 5, feedback: "" },
                          }))
                        }
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Experience
                      </Button>
                    )}

                    {/* Rating Form */}
                    {ratingData[request.id] && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <Select
                            value={ratingData[request.id].rating.toString()}
                            onValueChange={(value) =>
                              setRatingData((prev) => ({
                                ...prev,
                                [request.id]: { ...prev[request.id], rating: Number.parseInt(value) },
                              }))
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 4, 3, 2, 1].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} Star{num !== 1 ? "s" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Feedback (Optional)</Label>
                          <Textarea
                            value={ratingData[request.id].feedback}
                            onChange={(e) =>
                              setRatingData((prev) => ({
                                ...prev,
                                [request.id]: { ...prev[request.id], feedback: e.target.value },
                              }))
                            }
                            placeholder="Share your experience..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => submitRating(request.id, request.provider.id)}>
                            Submit Rating
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRatingData((prev) => {
                                const newData = { ...prev }
                                delete newData[request.id]
                                return newData
                              })
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">Sent {new Date(request.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests sent</h3>
                <p className="text-gray-600 mb-4">Start browsing skills to send your first swap request.</p>
                <Button asChild>
                  <Link href="/browse">Browse Skills</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
