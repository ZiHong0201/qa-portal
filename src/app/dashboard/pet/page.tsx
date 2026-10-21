import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudentBalance } from "@/lib/points";
import { petAccess, getPetView } from "@/lib/pet.server";
import { AdoptScreen } from "./adopt-screen";
import { PetScreen } from "./pet-screen";
import { getUiLang } from "@/lib/i18n.server";

export default async function PetPage() {
  const session = await auth();
  const studentId = session!.user.id;

  // Students who have not been given the cat should not learn it exists.
  if (!(await petAccess(studentId))) redirect("/dashboard");

  const [pet, { balance }] = await Promise.all([
    // The mood line is written on the server, so it needs the language here.
    getPetView(studentId, await getUiLang()),
    getStudentBalance(studentId),
  ]);

  if (!pet) return <AdoptScreen />;
  return <PetScreen pet={pet} balance={balance} />;
}
