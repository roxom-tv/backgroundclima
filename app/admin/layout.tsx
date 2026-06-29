import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifyToken } from '@/lib/auth/session-token';
import { AdminClientNav } from './AdminClientNav';

const COOKIE_NAME = 'x-session-data';
const LOGIN_PATH = '/admin/login';

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
    const pathname = (await headers()).get('x-pathname') ?? '';
    const cookieStore = await cookies();
    const tokenValue = cookieStore.get(COOKIE_NAME)?.value ?? '';
    const { env } = getCloudflareContext();
    const secret = (env.SESSION_SECRET as string | undefined) ?? '';
    const isValid = secret.length > 0 ? await verifyToken(tokenValue, secret, Date.now()) : false;

    if (pathname === LOGIN_PATH) {
        if (isValid) {
            redirect('/admin');
        }

        return <>{children}</>;
    }

    if (!isValid) {
        redirect(LOGIN_PATH);
    }

    return (
        <div className="h-screen flex flex-col bg-black overflow-hidden">
            <AdminClientNav />

            <main className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-4 overflow-hidden bg-black">
                <div className="h-full max-w-[1800px] mx-auto">{children}</div>
            </main>
        </div>
    );
}
