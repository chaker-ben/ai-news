import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl",
          },
        }}
      />
    </div>
  );
}
