import { useQuery } from "@tanstack/react-query";
import { aiApi } from "../../utils/api";

export function AiProviderBadge() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-provider"],
    queryFn: () => aiApi.getProvider().then((res) => res.data.data),
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  if (data.is_local) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
        🔒 ローカルAI
        <span className="text-green-600">({data.model})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
      ☁️ Claude AI
      <span className="text-purple-600">({data.model})</span>
    </span>
  );
}

export default AiProviderBadge;
