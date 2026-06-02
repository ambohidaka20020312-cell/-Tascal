import { useNavigate } from "react-router-dom";
import Button from "../common/Button";

interface UpgradePromptProps {
  message: string;
}

export default function UpgradePrompt({ message }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 shadow-sm">
      <div className="flex-shrink-0 text-yellow-500">
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="flex-1 text-sm font-medium text-yellow-800">{message}</p>
      <Button
        size="sm"
        variant="primary"
        className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
        onClick={() => navigate("/subscription")}
      >
        プランをアップグレード
      </Button>
    </div>
  );
}
