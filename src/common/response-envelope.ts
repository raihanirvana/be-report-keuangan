export type ResponseEnvelope<TData, TMeta = Record<string, never>> = {
  data: TData;
  error: null;
  meta: TMeta;
};

export function envelope<TData>(data: TData): ResponseEnvelope<TData> {
  return {
    data,
    error: null,
    meta: {},
  };
}
