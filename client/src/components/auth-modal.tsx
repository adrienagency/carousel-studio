import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function AuthModal() {
  const {
    showAuthModal, authModalMessage, closeAuthModal,
    login, register,
    loginError, registerError,
    isLoginPending, isRegisterPending,
  } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username: loginEmail, password: loginPassword });
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ username: regEmail, password: regPassword, displayName: regName });
    } catch {}
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {authModalMessage || "Se connecter a Carousel Studio"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Connexion</TabsTrigger>
            <TabsTrigger value="register" data-testid="tab-register">Inscription</TabsTrigger>
          </TabsList>

          {/* Login tab */}
          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  autoFocus
                  data-testid="input-login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  data-testid="input-login-password"
                />
              </div>

              {loginError && (
                <p className="text-sm text-destructive" data-testid="text-login-error">
                  Identifiants invalides
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoginPending}
                data-testid="button-login-submit"
              >
                {isLoginPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Se connecter
              </Button>
            </form>
          </TabsContent>

          {/* Register tab */}
          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Nom</Label>
                <Input
                  id="reg-name"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Votre nom"
                  data-testid="input-reg-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="text"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  data-testid="input-reg-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Mot de passe</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Choisissez un mot de passe"
                  required
                  data-testid="input-reg-password"
                />
              </div>

              {registerError && (
                <p className="text-sm text-destructive" data-testid="text-register-error">
                  Ce compte existe deja
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isRegisterPending}
                data-testid="button-register-submit"
              >
                {isRegisterPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Creer mon compte
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
