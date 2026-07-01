import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal";

// Upload de imagem de prêmio direto do navegador para o Vercel Blob.
// O client (@vercel/blob/client `upload`) chama esta rota para obter um token
// de curta duração. Só liberamos o token se houver admin autenticado.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const admin = await getCurrentAdmin();
        if (!admin) throw new Error("Não autorizado.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Não é chamado em localhost (o Blob não consegue notificar o dev local).
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
