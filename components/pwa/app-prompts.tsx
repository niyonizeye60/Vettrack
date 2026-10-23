"use client"

import { useState } from "react"
import InstallPrompt from "./install-prompt"
import PushPrompt from "./push-prompt"

/** The install and alerts prompts - one at a time, install first. */
export default function AppPrompts() {
  const [installVisible, setInstallVisible] = useState(false)

  return (
    <>
      <InstallPrompt onVisibleChange={setInstallVisible} />
      <PushPrompt hidden={installVisible} />
    </>
  )
}
