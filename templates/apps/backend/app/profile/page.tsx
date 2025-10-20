/**
 * プロフィールページ
 * ユーザー情報の表示・編集
 */
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { requireSession } from "@/lib/auth-server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  const serializableUser = {
    id: session.user?.id ?? "",
    name: session.user?.name ?? "",
    email: session.user?.email ?? "",
    role: session.user?.role ?? "user",
    image: user?.image ?? null,
  };

  return (
    <DashboardLayout user={serializableUser}>
      <ProfileForm user={JSON.parse(JSON.stringify(user))} />
    </DashboardLayout>
  );
}

// EOF
