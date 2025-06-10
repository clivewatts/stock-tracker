import ProductPageClient from '@/components/ProductPageClient';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Server component that receives the params and passes id to client component
export default async function ProductPage({ params }: ProductPageProps) {
  // Await params to access id property
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  return <ProductPageClient productId={id} />;
}
