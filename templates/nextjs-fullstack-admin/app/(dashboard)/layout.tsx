import { redirect } from "next/navigation";
import { Navigation } from "@/components/dashboard/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="w-64 flex-shrink-0">
                <Navigation />
            </div>
            <div className="flex-1 overflow-auto">
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
