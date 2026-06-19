import * as React from 'react'

const SidebarProvider = ({ children }: { children: React.ReactNode }) => (
  <div className="flex">{children}</div>
)

const Sidebar = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <aside className="w-64 bg-card border-r border-border" {...props}>
    {children}
  </aside>
)

const SidebarHeader = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="p-4" {...props}>{children}</div>
)

const SidebarContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="p-4" {...props}>{children}</div>
)

const SidebarMenu = ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul className="space-y-2" {...props}>{children}</ul>
)

const SidebarMenuItem = ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li {...props}>{children}</li>
)

const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/10 text-foreground hover:text-primary transition"
    {...props}
  />
))
SidebarMenuButton.displayName = 'SidebarMenuButton'

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
}
