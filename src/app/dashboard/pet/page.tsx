import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudentBalance } from "@/lib/points";
import { petAccess, getPetView } from "@/lib/pet.server";
import { AdoptScreen } from "./adopt-screen";
import { PetScreen } from "./pet-screen";

export default async function PetPage() {
  const session = await auth();
  const studentId = session!.user.id;

  // Students who have not been given the cat should not learn it exists.
  if (!(await petAccess(studentId))) redirect("/dashboard");

  const [pet, { balance }] = await Promise.all([
    getPetView(studentId),
    getStudentBalance(studentId),
  ]);

  if (!pet) return <AdoptScreen />;
  return <PetScreen pet={pet} balance={balance} />;
}
