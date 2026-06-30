import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  isMe: boolean;
  readByOthers: boolean;
}

export default function ReadReceipt({ isMe, readByOthers }: ReadReceiptProps) {
  if (!isMe) return null;

  return (
    <span className="inline-flex items-center ml-1">
      {readByOthers ? (
        <CheckCheck className="w-[14px] h-[14px] text-blue-400" />
      ) : (
        <Check className="w-[14px] h-[14px] text-white/50" />
      )}
    </span>
  );
}
