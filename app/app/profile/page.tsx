"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Users, Plus, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Profile {
  id: string
  name: string
  location: string | null
  availability: string | null
  is_public: boolean
}

interface Skill {
  id: string
  name: string
  description: string | null
  type: "offered" | "wanted"
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: "", description: "", type: "offered" as "offered" | "wanted" })
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
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
    const { data: skillsData } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (skillsData) {
      setSkills(skillsData)
    }

    setLoading(false)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return

    setSaving(true)
    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id)

    if (!error) {
      setProfile({ ...profile, ...updates })
    }
    setSaving(false)
  }

  const addSkill = async () => {
    if (!profile || !newSkill.name.trim()) return

    const { data, error } = await supabase
      .from("skills")
      .insert({
        user_id: profile.id,
        name: newSkill.name.trim(),
        description: newSkill.description.trim() || null,
        type: newSkill.type,
      })
      .select()
      .single()

    if (!error && data) {
      setSkills([data, ...skills])
      setNewSkill({ name: "", description: "", type: "offered" })
    }
  }

  const deleteSkill = async (skillId: string) => {
    const { error } = await supabase.from("skills").delete().eq("id", skillId)

    if (!error) {
      setSkills(skills.filter((s) => s.id !== skillId))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p>Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const offeredSkills = skills.filter((s) => s.type === "offered")
  const wantedSkills = skills.filter((s) => s.type === "wanted")

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
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    onBlur={() => updateProfile({ name: profile.name })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    onBlur={() => updateProfile({ location: profile.location })}
                    placeholder="e.g., New York, NY"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Textarea
                    id="availability"
                    value={profile.availability || ""}
                    onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                    onBlur={() => updateProfile({ availability: profile.availability })}
                    placeholder="e.g., Weekends, evenings after 6pm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Profile</Label>
                    <p className="text-sm text-gray-500">Allow others to find and contact you</p>
                  </div>
                  <Switch
                    checked={profile.is_public}
                    onCheckedChange={(checked) => updateProfile({ is_public: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add New Skill */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Skill
                </CardTitle>
                <CardDescription>Add skills you can offer or want to learn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skill-name">Skill Name</Label>
                  <Input
                    id="skill-name"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    placeholder="e.g., Web Development, Photography"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill-description">Description (Optional)</Label>
                  <Textarea
                    id="skill-description"
                    value={newSkill.description}
                    onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                    placeholder="Brief description of your skill level or what you want to learn"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skill Type</Label>
                  <Select
                    value={newSkill.type}
                    onValueChange={(value: "offered" | "wanted") => setNewSkill({ ...newSkill, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offered">I can offer this skill</SelectItem>
                      <SelectItem value="wanted">I want to learn this skill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addSkill} disabled={!newSkill.name.trim()}>
                  Add Skill
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Skills Lists */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Skills I Offer ({offeredSkills.length})</CardTitle>
                <CardDescription>Skills you can teach others</CardDescription>
              </CardHeader>
              <CardContent>
                {offeredSkills.length > 0 ? (
                  <div className="space-y-3">
                    {offeredSkills.map((skill) => (
                      <div key={skill.id} className="flex items-start justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">{skill.name}</h4>
                          {skill.description && <p className="text-sm text-green-700 mt-1">{skill.description}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSkill(skill.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No skills offered yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Skills I Want ({wantedSkills.length})</CardTitle>
                <CardDescription>Skills you'd like to learn</CardDescription>
              </CardHeader>
              <CardContent>
                {wantedSkills.length > 0 ? (
                  <div className="space-y-3">
                    {wantedSkills.map((skill) => (
                      <div key={skill.id} className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">{skill.name}</h4>
                          {skill.description && <p className="text-sm text-blue-700 mt-1">{skill.description}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSkill(skill.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No skills wanted yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
