"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Shield, Users, MessageSquare, AlertTriangle, ArrowLeft, Ban, Check, X, Send } from "lucide-react"
import Link from "next/link"

interface AdminStats {
  totalUsers: number
  totalSkills: number
  totalSwaps: number
  pendingSkills: number
}

interface User {
  id: string
  name: string
  location: string | null
  is_banned: boolean
  created_at: string
  _count: {
    skills: number
    swap_requests_sent: number
    swap_requests_received: number
  }
}

interface Skill {
  id: string
  name: string
  description: string | null
  is_approved: boolean
  user: { name: string }
  created_at: string
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

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalSkills: 0, totalSwaps: 0, pendingSkills: 0 })
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [messageTitle, setMessageTitle] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/signin")
      return
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      router.push("/dashboard")
      return
    }

    setIsAdmin(true)
    loadAdminData()
  }

  const loadAdminData = async () => {
    // Load stats
    const [usersCount, skillsCount, swapsCount, pendingSkillsCount] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("skills").select("id", { count: "exact", head: true }),
      supabase.from("swap_requests").select("id", { count: "exact", head: true }),
      supabase.from("skills").select("id", { count: "exact", head: true }).eq("is_approved", false),
    ])

    setStats({
      totalUsers: usersCount.count || 0,
      totalSkills: skillsCount.count || 0,
      totalSwaps: swapsCount.count || 0,
      pendingSkills: pendingSkillsCount.count || 0,
    })

    // Load users
    const { data: usersData } = await supabase
      .from("profiles")
      .select(`
        id,
        name,
        location,
        is_banned,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (usersData) {
      setUsers(
        usersData.map((user) => ({
          ...user,
          _count: { skills: 0, swap_requests_sent: 0, swap_requests_received: 0 },
        })),
      )
    }

    // Load skills pending approval
    const { data: skillsData } = await supabase
      .from("skills")
      .select(`
        id,
        name,
        description,
        is_approved,
        created_at,
        user:profiles!skills_user_id_fkey(name)
      `)
      .eq("is_approved", false)
      .order("created_at", { ascending: false })

    if (skillsData) {
      setSkills(skillsData)
    }

    // Load recent swaps
    const { data: swapsData } = await supabase
      .from("swap_requests")
      .select(`
        id,
        status,
        created_at,
        requester:profiles!swap_requests_requester_id_fkey(name),
        provider:profiles!swap_requests_provider_id_fkey(name),
        requested_skill:skills!swap_requests_requested_skill_id_fkey(name),
        offered_skill:skills!swap_requests_offered_skill_id_fkey(name)
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (swapsData) {
      setSwaps(swapsData)
    }

    setLoading(false)
  }

  const toggleUserBan = async (userId: string, isBanned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !isBanned }).eq("id", userId)

    if (!error) {
      setUsers(users.map((user) => (user.id === userId ? { ...user, is_banned: !isBanned } : user)))
    }
  }

  const approveSkill = async (skillId: string, approved: boolean) => {
    const { error } = await supabase.from("skills").update({ is_approved: approved }).eq("id", skillId)

    if (!error) {
      if (approved) {
        setSkills(skills.filter((skill) => skill.id !== skillId))
        setStats((prev) => ({ ...prev, pendingSkills: prev.pendingSkills - 1 }))
      } else {
        // Delete rejected skill
        await supabase.from("skills").delete().eq("id", skillId)
        setSkills(skills.filter((skill) => skill.id !== skillId))
        setStats((prev) => ({ ...prev, pendingSkills: prev.pendingSkills - 1 }))
      }
    }
  }

  const sendPlatformMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) return

    setSendingMessage(true)
    const { error } = await supabase.from("admin_messages").insert({
      title: messageTitle.trim(),
      message: messageContent.trim(),
    })

    if (!error) {
      setMessageTitle("")
      setMessageContent("")
    }
    setSendingMessage(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have admin privileges.</p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
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
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
              <Badge className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSkills}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSwaps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Skills</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSkills}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="skills" className="space-y-6">
          <TabsList>
            <TabsTrigger value="skills">Pending Skills ({skills.length})</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="swaps">Swap Monitoring</TabsTrigger>
            <TabsTrigger value="messages">Platform Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <Card key={skill.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                        <CardDescription>
                          Submitted by {skill.user.name} on {new Date(skill.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveSkill(skill.id, true)}>
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => approveSkill(skill.id, false)}>
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {skill.description && (
                    <CardContent>
                      <p className="text-gray-700">{skill.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No skills pending approval.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4">
              {users.slice(0, 20).map((user) => (
                <Card key={user.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-gray-500">
                          {user.location && `${user.location} • `}
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                      <Button
                        size="sm"
                        variant={user.is_banned ? "outline" : "destructive"}
                        onClick={() => toggleUserBan(user.id, user.is_banned)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {user.is_banned ? "Unban" : "Ban"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="swaps" className="space-y-4">
            <div className="grid gap-4">
              {swaps.map((swap) => (
                <Card key={swap.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {swap.requester.name} ↔ {swap.provider.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {swap.requested_skill.name} for {swap.offered_skill.name}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(swap.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge
                        variant={
                          swap.status === "completed"
                            ? "secondary"
                            : swap.status === "accepted"
                              ? "default"
                              : swap.status === "pending"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {swap.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Platform-wide Message</CardTitle>
                <CardDescription>Send announcements, updates, or alerts to all users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Message Title</Label>
                  <Input
                    id="title"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="e.g., Platform Update, Maintenance Notice"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message Content</Label>
                  <Textarea
                    id="message"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={sendPlatformMessage}
                  disabled={!messageTitle.trim() || !messageContent.trim() || sendingMessage}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingMessage ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
