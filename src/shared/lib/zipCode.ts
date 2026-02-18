const digitsOnly = (value: string) => value.replace(/\D/g, '');

export interface ZipCodeLookupResult {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export const normalizeZipCodeDigits = (value: string) => digitsOnly(value).slice(0, 8);

export const buildAddressLineFromZipCode = (result: ZipCodeLookupResult) => {
  const parts = [result.street, result.neighborhood].filter(Boolean);
  return parts.join(' - ');
};

export const lookupAddressByZipCode = async (
  zipCode: string
): Promise<ZipCodeLookupResult | null> => {
  const normalized = normalizeZipCodeDigits(zipCode);
  if (normalized.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`);
  if (!response.ok) {
    throw new Error('Nao foi possivel consultar o CEP no momento.');
  }

  const payload = (await response.json()) as ViaCepResponse;
  if (payload.erro) return null;

  return {
    zipCode: normalizeZipCodeDigits(payload.cep ?? normalized),
    street: String(payload.logradouro ?? '').trim(),
    neighborhood: String(payload.bairro ?? '').trim(),
    city: String(payload.localidade ?? '').trim(),
    state: String(payload.uf ?? '').trim().toUpperCase(),
  };
};
