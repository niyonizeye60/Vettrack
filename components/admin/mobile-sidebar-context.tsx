// The admin portal was the first staff portal, so this context lived here. It now
// belongs to the shared staff shell - re-exported so existing admin imports (and
// the provider identity they depend on) keep working.
export { MobileSidebarProvider, useMobileSidebar } from "@/components/staff/mobile-sidebar-context";
