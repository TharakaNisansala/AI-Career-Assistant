import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { PasswordVisibilityToggle } from "@/components/ui/PasswordVisibilityToggle";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ApiRequestError } from "@/lib/apiClient";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: FieldErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: confirmPassword !== password ? "Passwords do not match" : undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      // The just-registered flag itself now lives in AuthContext (set
      // atomically with the user, so it survives GuestRoute's own redirect
      // racing ahead of this one) -- this navigate is just the normal
      // fast-path off the register form.
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "Unable to register");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start improving your job search today">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {formError && <Alert variant="error">{formError}</Alert>}

        <Input
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          required
        />
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
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint="At least 8 characters"
          required
          endAdornment={
            <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          }
        />
        <Input
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          required
          endAdornment={
            <PasswordVisibilityToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((v) => !v)}
            />
          }
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
