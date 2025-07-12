"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, Plus, Search, MessageSquare, Star, Settings, LogOut } from "lucide-react"

interface Profile {
  id: string
  name: string
  location: string | null
  is_admin: boolean
}

interface Skill {
  id: string
  name: string
  type: "offered" | "wanted"
}

interface SwapRequest {
  id: string
  status: string
  created_at: string
  requester: { name: string }
  provider: { name: string }
  requested_skill: { name: string }
  offered_skill: { name: string }
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/signin")
      return
    }

    // Get profile
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (profileData) {
      setProfile(profileData)
    }

    // Get skills
    const { data: skillsData } = await supabase.from("skills").select("*").eq("user_id", user.id)

    if (skillsData) {
      setSkills(skillsData)
    }

    // Get swap requests
    const { data: swapData } = await supabase
      .from("swap_requests")
      .select(`
        *,
        requester:profiles!swap_requests_requester_id_fkey(name),
        provider:profiles!swap_requests_provider_id_fkey(name),
        requested_skill:skills!swap_requests_requested_skill_id_fkey(name),
        offered_skill:skills!swap_requests_offered_skill_id_fkey(name)
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (swapData) {
      setSwapRequests(swapData)
    }

    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const offeredSkills = skills.filter((s) => s.type === "offered")
  const wantedSkills = skills.filter((s) => s.type === "wanted")
  const pendingRequests = swapRequests.filter((r) => r.status === "pending")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {profile?.name}</span>
            {profile?.is_admin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Admin Panel</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/profile">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button asChild className="h-20 flex-col gap-2">
            <Link href="/browse">
              <Search className="h-6 w-6" />
              Browse Skills
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
            <Link href="/profile">
              <Plus className="h-6 w-6" />
              Add Skills
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
            <Link href="/requests">
              <MessageSquare className="h-6 w-6" />
              Swap Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
            <Link href="/profile">
              <Star className="h-6 w-6" />
              My Profile
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Skills Overview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-600" />
                  Skills I Offer ({offeredSkills.length})
                </CardTitle>
                <CardDescription>Skills you can teach others</CardDescription>
              </CardHeader>
              <CardContent>
                {offeredSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {offeredSkills.map((skill) => (
                      <Badge key={skill.id} variant="secondary">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No skills added yet.{" "}
                    <Link href="/profile" className="text-blue-600 hover:underline">
                      Add some skills
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Skills I Want ({wantedSkills.length})
                </CardTitle>
                <CardDescription>Skills you'd like to learn</CardDescription>
              </CardHeader>
              <CardContent>
                {wantedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {wantedSkills.map((skill) => (
                      <Badge key={skill.id} variant="outline">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No skills added yet.{" "}
                    <Link href="/profile" className="text-blue-600 hover:underline">
                      Add some skills
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Recent Swap Requests
              </CardTitle>
              <CardDescription>Your latest swap activity</CardDescription>
            </CardHeader>
            <CardContent>
              {swapRequests.length > 0 ? (
                <div className="space-y-3">
                  {swapRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {request.requested_skill.name} ↔ {request.offered_skill.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.requester.name} → {request.provider.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          request.status === "pending"
                            ? "default"
                            : request.status === "accepted"
                              ? "secondary"
                              : request.status === "completed"
                                ? "secondary"
                                : "destructive"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                    <Link href="/requests">View All Requests</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No swap requests yet.{" "}
                  <Link href="/browse" className="text-blue-600 hover:underline">
                    Start browsing skills
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
