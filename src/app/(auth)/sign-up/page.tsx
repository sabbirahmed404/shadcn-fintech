import { redirect } from "next/navigation"

// Sign-up is disabled. Redirect any visitors to the sign-in page.
export default function SignUpPage() {
  redirect("/sign-in")
}
