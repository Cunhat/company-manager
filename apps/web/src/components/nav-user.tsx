import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { IconLogout, IconSelector } from "@tabler/icons-react";
import { useNavigate, useRouter } from "@tanstack/react-router";

export function NavUser() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-xl px-3 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
            aria-busy="true"
            aria-label="Loading user"
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="grid flex-1 gap-1 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const userInfo = session?.user;
  const userName = userInfo?.name ?? "";
  const userEmail = userInfo?.email ?? "";
  const userFallback = userName.charAt(0) ?? "";
  const userImage = userInfo?.image ?? "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback>{userFallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs">{userEmail}</span>
            </div>
            <IconSelector className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback>{userFallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                    <span className="truncate text-xs">{userEmail}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut({
                  fetchOptions: {
                    onSuccess: async () => {
                      await router.invalidate();
                      await navigate({ to: "/login", replace: true });
                    },
                  },
                });
              }}
            >
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
