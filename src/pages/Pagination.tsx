import { motion } from 'framer-motion';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // 只显示当前页附近的页码
  const visiblePages = pages.filter(page => {
    if (page === 1 || page === totalPages) return true;
    if (Math.abs(page - currentPage) <= 1) return true;
    return false;
  });

  return (
    <div className="flex justify-center items-center space-x-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-lg bg-[#0A192F]/50 border border-[#00D1FF]/50 text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00D1FF]/10"
      >
        上一页
      </button>

      {visiblePages.map((page, index) => {
        // 添加省略号
        if (index > 0 && page - visiblePages[index - 1] > 1) {
          return (
            <span key={`ellipsis-${page}`} className="text-white/80">
              ...
            </span>
          );
        }

        return (
          <motion.button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg ${
              currentPage === page
                ? 'bg-[#00D1FF] text-white'
                : 'bg-[#0A192F]/50 border border-[#00D1FF]/50 text-white/80 hover:bg-[#00D1FF]/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {page}
          </motion.button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-lg bg-[#0A192F]/50 border border-[#00D1FF]/50 text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00D1FF]/10"
      >
        下一页
      </button>
    </div>
  );
} 