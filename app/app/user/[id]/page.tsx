"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useRouter, useParams } from "next/navigation"
import { Users, MapPin, Clock, ArrowLeft, Star, Send } from "lucide-react"
import Link from "next/link"

interface UserProfile {
  id: string
  name: string
  location: string | null
  availability: string | null
  skills: Array<{
    id: string
    name: string
    description: string | null
    type: "offered" | "wanted"
  }>
}

interface MySkill {
  id: string
  name: string
  type: "offered" | "wanted"
}

interface Rating {
  rating: number
  feedback: string | null
  rater: { name: string }
  created_at: string
}

export default function UserProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mySkills, setMySkills] = useState<MySkill[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [requestLoading, setRequestLoading] = useState(false)
  const [selectedMySkill, setSelectedMySkill] = useState("")
  const [selectedTheirSkill, setSelectedTheirSkill] = useState("")
  const [message, setMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  useEffect(() => {
    loadUserProfile()
  }, [userId])

  const loadUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/signin")
      return
    }

    setCurrentUserId(user.id)

    // Get user profile with skills
    const { data: profileData } = await supabase
      .from("profiles")
      .select(`
        id,
        name,
        location,
        availability,
        skills (
          id,
          name,
          description,
          type
        )
      `)
      .eq("id", userId)
      .eq("is_public", true)
      .single()

    if (profileData) {
      setUserProfile(profileData)
    }

    // Get my skills
    const { data: mySkillsData } = await supabase.from("skills").select("id, name, type").eq("user_id", user.id)

    if (mySkillsData) {
      setMySkills(mySkillsData)
    }

    // Get ratings for this user
    const { data: ratingsData } = await supabase
      .from("ratings")
      .select(`
        rating,
        feedback,
        created_at,
        rater:profiles!ratings_rater_id_fkey(name)
      `)
      .eq("rated_id", userId)
      .order("created_at", { ascending: false })

    if (ratingsData) {
      setRatings(ratingsData)
    }

    setLoading(false)
  }

  const sendSwapRequest = async () => {
    if (!currentUserId || !selectedMySkill || !selectedTheirSkill) return

    setRequestLoading(true)

    const { error } = await supabase.from("swap_requests").insert({
      requester_id: currentUserId,
      provider_id: userId,
      requested_skill_id: selectedTheirSkill,
      offered_skill_id: selectedMySkill,
      message: message.trim() || null,
    })

    if (!error) {
      router.push("/requests?tab=sent")
    }

    setRequestLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">This user profile is not available.</p>
          <Button asChild>
            <Link href="/browse">Back to Browse</Link>
          </Button>
        </div>
      </div>
    )
  }

  const offeredSkills = userProfile.skills.filter((s) => s.type === "offered")
  const wantedSkills = userProfile.skills.filter((s) => s.type === "wanted")
  const myOfferedSkills = mySkills.filter((s) => s.type === "offered")
  const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/browse">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl">
                      {userProfile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
                    {userProfile.location && (
                      <div className="flex items-center gap-1 text-gray-600 mt-1">
                        <MapPin className="h-4 w-4" />
                        {userProfile.location}
                      </div>
                    )}
                    {ratings.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{averageRating.toFixed(1)}</span>
                        <span className="text-gray-500">({ratings.length} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
                {userProfile.availability && (
                  <div className="flex items-center gap-2 text-gray-600 mt-4">
                    <Clock className="h-4 w-4" />
                    <span>{userProfile.availability}</span>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Skills */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Skills Offered ({offeredSkills.length})</CardTitle>
                  <CardDescription>Skills this user can teach</CardDescription>
                </CardHeader>
                <CardContent>
                  {offeredSkills.length > 0 ? (
                    <div className="space-y-3">
                      {offeredSkills.map((skill) => (
                        <div key={skill.id} className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900">{skill.name}</h4>
                          {skill.description && <p className="text-sm text-green-700 mt-1">{skill.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No skills offered.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Skills Wanted ({wantedSkills.length})</CardTitle>
                  <CardDescription>Skills this user wants to learn</CardDescription>
                </CardHeader>
                <CardContent>
                  {wantedSkills.length > 0 ? (
                    <div className="space-y-3">
                      {wantedSkills.map((skill) => (
                        <div key={skill.id} className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900">{skill.name}</h4>
                          {skill.description && <p className="text-sm text-blue-700 mt-1">{skill.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No skills wanted.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviews */}
            {ratings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Reviews ({ratings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ratings.slice(0, 5).map((rating, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < rating.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-medium">{rating.rater.name}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.feedback && <p className="text-gray-700 text-sm">{rating.feedback}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Request Swap */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Request Skill Swap
                </CardTitle>
                <CardDescription>Propose a skill exchange with {userProfile.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>I want to learn:</Label>
                  <Select value={selectedTheirSkill} onValueChange={setSelectedTheirSkill}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select their skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {offeredSkills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>I can offer:</Label>
                  <Select value={selectedMySkill} onValueChange={setSelectedMySkill}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {myOfferedSkills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself and explain what you'd like to learn..."
                    rows={4}
                  />
                </div>

                {myOfferedSkills.length === 0 && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                    You need to add some skills you can offer before requesting a swap.{" "}
                    <Link href="/profile" className="underline">
                      Add skills to your profile
                    </Link>
                  </div>
                )}

                {offeredSkills.length === 0 && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    This user hasn't listed any skills they can offer yet.
                  </div>
                )}

                <Button
                  onClick={sendSwapRequest}
                  disabled={!selectedMySkill || !selectedTheirSkill || requestLoading}
                  className="w-full"
                >
                  {requestLoading ? "Sending Request..." : "Send Swap Request"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
