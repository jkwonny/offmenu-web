import ChatRequestClient from '../../../chat/request/[venue_id]/ChatRequestClient';

export default async function ChatRequestPage({ params }: { params: Promise<{ venue_id: string }> }) {
    const { venue_id } = await params;
    return <ChatRequestClient venue_id={venue_id} />;
} 