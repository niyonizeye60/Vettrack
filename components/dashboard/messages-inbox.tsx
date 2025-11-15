"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send } from "lucide-react"
import { MessagesPanel } from "./messages-panel"

interface MessagesInboxProps {
  userId?: string;
}

// Sample data
const conversations = [
  {
    id: "conv1",
    contact: "Dr. Jean Mugisha",
    avatar: "JM",
    lastMessage: "Your cow's test results are ready. Please check the attached report.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "conv2",
    contact: "Dr. Alice Uwimana",
    avatar: "AU",
    lastMessage: "Follow-up on Max's treatment. How is he responding to the medication?",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "conv3",
    contact: "System Notification",
    avatar: "SN",
    lastMessage: "Your tracking device for Bella needs battery replacement soon.",
    time: "2 days ago",
    unread: false,
  },
]

const messages = [
  {
    id: "msg1",
    sender: "Dr. Jean Mugisha",
    content: "Hello! I've reviewed the test results for your cow Bella.",
    time: "10:30 AM",
    isMe: false,
  },
  {
    id: "msg2",
    sender: "Dr. Jean Mugisha",
    content: "The blood work shows normal values, which is good news.",
    time: "10:31 AM",
    isMe: false,
  },
  {
    id: "msg3",
    sender: "Me",
    content: "That's great to hear! What about the other tests?",
    time: "10:35 AM",
    isMe: true,
  },
  {
    id: "msg4",
    sender: "Dr. Jean Mugisha",
    content: "All other tests are normal as well. I've attached the full report for your records.",
    time: "10:40 AM",
    isMe: false,
  },
  {
    id: "msg5",
    sender: "Dr. Jean Mugisha",
    content:
      "I recommend continuing with the current diet and monitoring for any changes in behavior or milk production.",
    time: "10:42 AM",
    isMe: false,
  },
  {
    id: "msg6",
    sender: "Me",
    content: "Thank you, Doctor. I'll keep monitoring and let you know if I notice anything unusual.",
    time: "10:45 AM",
    isMe: true,
  },
]

export default function MessagesInbox({ userId }: MessagesInboxProps) {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [newMessage, setNewMessage] = useState("")

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return
    // In a real app, this would send the message to the server
    console.log("Sending message:", newMessage)
    setNewMessage("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <MessagesPanel userId={userId} />
      </CardContent>
    </Card>
  )
}
