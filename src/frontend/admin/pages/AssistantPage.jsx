import {
  useAssistantConversations,
  useDeleteAssistantConversation,
} from '../queries/assistantQueries';
import { AssistantTable } from '../components/AssistantTable';

export default function AssistantPage() {
  const { data, isLoading } = useAssistantConversations();
  const deleteMutation = useDeleteAssistantConversation();

  const handleDelete = async id => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="assistant-page">
      <div className="assistant-page__header">
        <h2>Assistant Conversations</h2>
      </div>
      <AssistantTable conversations={data?.conversations || []} onDelete={handleDelete} />
    </div>
  );
}
