export type ResponseEnvelope<TData, TMeta = Record<string, never>> = {
  data: TData;
  error: null;
  meta: TMeta;
};

export function envelope<TData, TMeta = Record<string, never>>(
  data: TData,
  meta?: TMeta,
): ResponseEnvelope<TData, TMeta> {
  return {
    data,
    error: null,
    meta: meta ?? ({} as TMeta),
  };
}
