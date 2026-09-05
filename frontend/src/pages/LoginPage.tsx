import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ApiRequestError } from "@/lib/apiClient";
import { validateEmail, validateRequired, getSafeRedirectPath } from "@/lib/validation";

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = getSafeRedirectPath((location.state as { from?: string } | null)?.from);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "Unable to log in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Log in to continue to your dashboard">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {formError && <Alert variant="error">{formError}</Alert>}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Log in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
