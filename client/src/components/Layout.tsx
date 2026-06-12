import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  BrainCircuit,
  ShieldAlert,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { useCurrentUserProfile } from "@lark-apaas/client-toolkit/hooks/useCurrentUserProfile";
import { getDataloom } from "@lark-apaas/client-toolkit/dataloom";
import { logger } from "@lark-apaas/client-toolkit/logger";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb";

const GUEST_AVATAR =
  "https://lf3-static.bytednsdoc.com/obj/eden-cn/LMfspH/ljhwZthlaukjlkulzlp/miao/no-person.svg";

const navItems = [
  { path: "/", label: "大盘总览", icon: LayoutDashboard },
  { path: "/models", label: "模型指标明细", icon: Activity },
  { path: "/analysis", label: "AI运营分析", icon: BrainCircuit },
  { path: "/alerts", label: "预警管理", icon: ShieldAlert },
];

const LayoutContent: React.FC = () => {
  const { pathname } = useLocation();
  const userInfo = useCurrentUserProfile();

  const activeTitle =
    navItems.find((item) => item.path === pathname)?.label ?? "";

  const isLoggedIn = !!userInfo?.user_id;

  const handleLogout = async () => {
    try {
      const dataloom = await getDataloom();
      const session = (dataloom as { service: { session: { signOut: () => Promise<{ error?: { message: string } }> } } }).service.session;
      const result = await session.signOut();
      if (result.error) {
        logger.error("退出登录失败:", result.error.message);
        return;
      }
      window.location.reload();
    } catch (err) {
      logger.error("退出登录失败", String(err));
    }
  };

  const handleLogin = async () => {
    const dataloom = await getDataloom();
    const session = (dataloom as { service: { session: { redirectToLogin: () => void } } }).service.session;
    session.redirectToLogin();
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex items-center justify-center size-8 rounded-sm bg-primary text-primary-foreground font-semibold text-sm">
                    M
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold text-sm text-sidebar-accent-foreground">
                      模型运营数据后台
                    </span>
                    <span className="text-xs text-sidebar-foreground">
                      Model DevOps
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.path}
                    >
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="size-8">
                      <AvatarImage
                        src={isLoggedIn ? userInfo?.avatar : GUEST_AVATAR}
                      />
                      <AvatarFallback>
                        {isLoggedIn ? (userInfo?.name?.[0] ?? "U") : "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium text-sidebar-accent-foreground">
                        {isLoggedIn ? userInfo?.name : "游客"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-48">
                  {isLoggedIn ? (
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="size-4 mr-2" />
                      退出登录
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleLogin}>
                      登录
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden p-4">
        <header className="flex items-center gap-2 mb-4">
          <SidebarTrigger />
          <Breadcrumb className="self-center">
            <BreadcrumbList>
              <BreadcrumbItem className="text-foreground font-medium">
                {activeTitle}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </>
  );
};

const Layout: React.FC = () => (
  <SidebarProvider>
    <LayoutContent />
  </SidebarProvider>
);

export default Layout;
