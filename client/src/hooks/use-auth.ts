import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/auth-store";
import { guestStorage } from "@/lib/guest-storage";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const {
    user, setUser, isLoading,
    showAuthModal, authModalMessage,
    openAuthModal, closeAuthModal,
  } = useAuthStore();
  const { toast } = useToast();

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        return await res.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!queryLoading) {
      setUser(data || null);
    }
  }, [data, queryLoading, setUser]);

  const migrateGuestData = async (userId?: number) => {
    if (!guestStorage.hasData()) return;
    const guestCarousels = guestStorage.extractAndClear();
    let migrated = 0;
    for (const gc of guestCarousels) {
      try {
        await apiRequest("POST", "/api/carousels", {
          title: gc.title,
          slides: gc.slides,
          settings: gc.settings,
          brandKitId: gc.brandKitId,
        });
        migrated++;
      } catch (e) {
        console.warn("Failed to migrate carousel:", e);
      }
    }
    if (migrated > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/carousels"] });
      toast({
        title: "Synchronisation terminee",
        description: `${migrated} carrousel${migrated > 1 ? "s" : ""} ${migrated > 1 ? "ont ete synchronises" : "a ete synchronise"} avec votre compte.`,
      });
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: async (data) => {
      setUser(data);
      closeAuthModal();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await migrateGuestData(data.id);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string; displayName?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return await res.json();
    },
    onSuccess: async (data) => {
      setUser(data);
      closeAuthModal();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await migrateGuestData(data.id);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading: isLoading && queryLoading,
    isGuest: !user && !queryLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    showAuthModal,
    authModalMessage,
    openAuthModal,
    closeAuthModal,
  };
}
