import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, isLoginPending, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="Carousel Studio">
              <rect x="2" y="6" width="28" height="20" rx="4" stroke="hsl(239 84% 67%)" strokeWidth="2.5" fill="none" />
              <rect x="8" y="11" width="7" height="10" rx="1.5" fill="hsl(239 84% 67%)" opacity="0.3" />
              <rect x="12.5" y="9" width="7" height="14" rx="1.5" fill="hsl(239 84% 67%)" opacity="0.6" />
              <rect x="17" y="11" width="7" height="10" rx="1.5" fill="hsl(239 84% 67%)" />
            </svg>
            <span className="text-xl font-bold tracking-tight">Carousel Studio</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour continuer
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  data-testid="input-password"
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
                data-testid="button-login"
              >
                {isLoginPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Se connecter
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                Creer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
