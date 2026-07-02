"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2,
  List, ListOrdered, Quote,
  Link, Unlink, Eraser,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

interface ToolGroup {
  tools: {
    icon: React.ElementType
    title: string
    command?: string
    action: () => void
  }[]
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = 180,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const prevValueRef = useRef(value)
  const isFirstRender = useRef(true)
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set())

  // Sync external value → DOM.
  // Always runs on first render (to seed initial content), then only when
  // the value changes from outside (not from our own onInput).
  useEffect(() => {
    if (!editorRef.current) return
    if (!isFirstRender.current && value === prevValueRef.current) return
    isFirstRender.current = false
    const normalizedCurrent =
      editorRef.current.innerHTML === "<br>" ? "" : editorRef.current.innerHTML
    if (value !== normalizedCurrent) {
      editorRef.current.innerHTML = value
    }
    prevValueRef.current = value
  }, [value])

  // Track active formatting states on selection change
  useEffect(() => {
    const update = () => {
      const cmds = ["bold", "italic", "underline", "strikeThrough"]
      const active = new Set<string>()
      cmds.forEach(cmd => {
        try { if (document.queryCommandState(cmd)) active.add(cmd) } catch {}
      })
      setActiveCommands(active)
    }
    document.addEventListener("selectionchange", update)
    return () => document.removeEventListener("selectionchange", update)
  }, [])

  const exec = useCallback((command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    if (editorRef.current) {
      const html = editorRef.current.innerHTML === "<br>" ? "" : editorRef.current.innerHTML
      prevValueRef.current = html
      onChange(html)
    }
  }, [onChange])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML === "<br>" ? "" : editorRef.current.innerHTML
    prevValueRef.current = html
    onChange(html)
  }, [onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const plain = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, plain)
    handleInput()
  }, [handleInput])

  const handleLink = useCallback(() => {
    const sel = window.getSelection()
    const selectedText = sel?.toString() || ""
    if (selectedText) {
      const url = window.prompt("Enter URL:", "https://")
      if (url) exec("createLink", url)
    } else {
      const url = window.prompt("Enter URL:", "https://")
      const label = window.prompt("Link text:", "")
      if (url && label) {
        exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
      }
    }
  }, [exec])

  const toolGroups: ToolGroup[] = [
    {
      tools: [
        { icon: Bold,          title: "Bold (Ctrl+B)",         command: "bold",          action: () => exec("bold") },
        { icon: Italic,        title: "Italic (Ctrl+I)",       command: "italic",        action: () => exec("italic") },
        { icon: Underline,     title: "Underline (Ctrl+U)",    command: "underline",     action: () => exec("underline") },
        { icon: Strikethrough, title: "Strikethrough",         command: "strikeThrough", action: () => exec("strikeThrough") },
      ],
    },
    {
      tools: [
        { icon: Heading1, title: "Heading 1", action: () => exec("formatBlock", "<h2>") },
        { icon: Heading2, title: "Heading 2", action: () => exec("formatBlock", "<h3>") },
      ],
    },
    {
      tools: [
        { icon: List,         title: "Bullet List",    action: () => exec("insertUnorderedList") },
        { icon: ListOrdered,  title: "Numbered List",  action: () => exec("insertOrderedList") },
        { icon: Quote,        title: "Blockquote",     action: () => exec("formatBlock", "<blockquote>") },
      ],
    },
    {
      tools: [
        { icon: Link,   title: "Insert Link",  action: handleLink },
        { icon: Unlink, title: "Remove Link",  action: () => exec("unlink") },
      ],
    },
    {
      tools: [
        { icon: Eraser, title: "Clear Formatting", action: () => exec("removeFormat") },
      ],
    },
  ]

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-shadow",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
      className
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-px px-2 py-1.5 border-b bg-gray-50">
        {toolGroups.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <div className="h-4 w-px bg-gray-300 mx-1.5" />}
            {group.tools.map((tool) => (
              <Button
                key={tool.title}
                type="button"
                variant="ghost"
                size="sm"
                title={tool.title}
                className={cn(
                  "h-7 w-7 p-0 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200",
                  tool.command && activeCommands.has(tool.command) &&
                    "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                )}
                onMouseDown={(e) => {
                  e.preventDefault() // keep editor focused
                  tool.action()
                }}
              >
                <tool.icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "px-4 py-3 text-sm focus:outline-none bg-white",
          // Placeholder via CSS
          "[&:empty:before]:content-[attr(data-placeholder)]",
          "[&:empty:before]:text-gray-400",
          "[&:empty:before]:pointer-events-none",
          // Headings
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
          // Lists
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
          "[&_li]:my-0.5",
          // Blockquote
          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3",
          "[&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-2",
          // Inline
          "[&_a]:text-blue-600 [&_a]:underline",
          "[&_strong]:font-bold",
          "[&_em]:italic",
          "[&_u]:underline",
          "[&_s]:line-through",
          "leading-relaxed"
        )}
      />
    </div>
  )
}
