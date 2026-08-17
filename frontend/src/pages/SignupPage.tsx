import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface SignupForm {
  email: string;
  password: string;
  full_name: string;
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignupForm>();

  const onSubmit = async (values: SignupForm) => {
    setError(null);
    try {
      await signup(values.email, values.password, values.full_name);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Não foi possível criar a conta");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            {...register("full_name")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            {...register("email", { required: true })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            {...register("password", { required: true, minLength: 8 })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Cadastrar
        </button>

        <p className="text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
