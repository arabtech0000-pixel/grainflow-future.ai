import React from 'react';
import { Product } from '../types';
import { formatUGX } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  onInvest: (product: Product) => void;
}

const getTierImage = (product: Product): string => {
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    return product.image;
  }
  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim() !== '') {
    return product.imageUrl;
  }
  const name = (product.name || '').toLowerCase();
  const amt = product.investmentAmount || 0;
  if (name.includes('1') || amt === 20000) return '/images/product_1_seeding_equipment.jpg';
  if (name.includes('2') || amt === 50000) return '/images/product_2_livestock_farm_equipment.jpg';
  if (name.includes('3') || amt === 120000) return '/images/product_3_green_tractor.jpg';
  if (name.includes('4') || amt === 250000) return '/images/product_4_multiple_tractors.jpg';
  if (name.includes('5') || amt === 500000) return '/images/product_5_large_scale_crop.jpg';
  if (name.includes('6') || amt === 1000000) return '/images/product_6_modern_agritech.jpg';
  return '/images/product_1_seeding_equipment.jpg';
};

const getFallbackImage = (product: Product): string => {
  const name = (product.name || '').toLowerCase();
  const amt = product.investmentAmount || 0;
  if (name.includes('1') || amt === 20000) return 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=80';
  if (name.includes('2') || amt === 50000) return 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80';
  if (name.includes('3') || amt === 120000) return 'https://images.unsplash.com/photo-1595974482597-4f82d77bc2b8?w=800&auto=format&fit=crop&q=80';
  if (name.includes('4') || amt === 250000) return 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&auto=format&fit=crop&q=80';
  if (name.includes('5') || amt === 500000) return 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&auto=format&fit=crop&q=80';
  if (name.includes('6') || amt === 1000000) return 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=80';
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onInvest }) => {
  const productImage = getTierImage(product);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm flex flex-col hover:border-slate-700 transition-all relative">
      {product.isPopular && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-black uppercase text-slate-950 px-2 py-0.5 rounded-md z-10 shadow-sm shadow-amber-500/20">
          Most Popular
        </div>
      )}
      
      {/* Product Thumbnail Image */}
      <div className="h-36 w-full bg-slate-950 relative overflow-hidden border-b border-slate-800">
        <img
          src={productImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 opacity-95"
          onError={(e) => {
            const fallback = getFallbackImage(product);
            if ((e.target as HTMLImageElement).src !== fallback) {
              (e.target as HTMLImageElement).src = fallback;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-85" />
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <div className="font-black text-white text-xs bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-700/50 truncate shadow-md">
            {product.name}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[10px] text-slate-400 font-medium">Duration: <span className="text-white font-bold">{product.durationDays} Days</span></div>
          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Verified Agri-Plan
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[9px] text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">Investment</div>
            <div className="text-xs font-black text-white">{formatUGX(product.investmentAmount)}</div>
          </div>
          <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800/80">
            <div className="text-[9px] text-amber-500/80 font-semibold mb-0.5 uppercase tracking-wider">Daily Return</div>
            <div className="text-xs font-black text-amber-500">{formatUGX(product.dailyIncome)}</div>
          </div>
        </div>

        <div className="mt-auto space-y-1.5 mb-3 text-[10px] text-slate-300">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-800/60">
            <span className="text-slate-400">Total Expected:</span>
            <span className="font-bold text-white">{formatUGX(product.totalExpectedEarnings)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total Return + Principal:</span>
            <span className="font-bold text-emerald-400">{formatUGX(product.totalPayout)}</span>
          </div>
        </div>

        <button
          onClick={() => onInvest(product)}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] flex items-center justify-center space-x-1.5"
        >
          <span>Invest Now</span>
        </button>
      </div>
    </div>
  );
};
