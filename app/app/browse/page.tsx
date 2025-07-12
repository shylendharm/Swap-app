"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Users, Search, MapPin, Clock, ArrowLeft, MessageSquare } from "lucide-react"
import Link from "next/link"

interface UserWithSkills {
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

export default function BrowsePage() {
  const [users, setUsers] = useState<UserWithSkills[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithSkills[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, users])

  const loadUsers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/signin")
      return
    }

    setCurrentUserId(user.id)

    // Get all public profiles with their skills
    const { data: profilesData } = await supabase
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
      .eq("is_public", true)
      .eq("is_banned", false)
      .neq("id", user.id)

    if (profilesData) {
      setUsers(profilesData)
    }

    setLoading(false)
  }

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }

    const filtered = users.filter((user) => {
      const nameMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase())
      const locationMatch = user.location?.toLowerCase().includes(searchTerm.toLowerCase())
      const skillMatch = user.skills.some((skill) => skill.name.toLowerCase().includes(searchTerm.toLowerCase()))
      return nameMatch || locationMatch || skillMatch
    })

    setFilteredUsers(filtered)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading skill providers...</p>
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
            <Search className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Browse Skills</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, location, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Found {filteredUsers.length} skill providers</p>
        </div>

        {/* Users Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => {
            const offeredSkills = user.skills.filter((s) => s.type === "offered")
            const wantedSkills = user.skills.filter((s) => s.type === "wanted")

            return (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
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
                    <div className="flex-1">
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      {user.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {user.location}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.availability && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {user.availability}
                    </div>
                  )}

                  {offeredSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Offers:</h4>
                      <div className="flex flex-wrap gap-1">
                        {offeredSkills.slice(0, 3).map((skill) => (
                          <Badge key={skill.id} variant="secondary" className="text-xs">
                            {skill.name}
                          </Badge>
                        ))}
                        {offeredSkills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{offeredSkills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {wantedSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Wants:</h4>
                      <div className="flex flex-wrap gap-1">
                        {wantedSkills.slice(0, 3).map((skill) => (
                          <Badge key={skill.id} variant="outline" className="text-xs">
                            {skill.name}
                          </Badge>
                        ))}
                        {wantedSkills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{wantedSkills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button asChild size="sm" className="w-full">
                    <Link href={`/user/${user.id}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Profile & Request Swap
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search terms or browse all available skills.</p>
          </div>
        )}
      </div>
    </div>
  )
}
