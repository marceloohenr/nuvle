export interface BrazilStateOption {
  code: string;
  name: string;
}

interface IbgeCityRow {
  nome?: string;
}

export const BRAZIL_STATE_OPTIONS: ReadonlyArray<BrazilStateOption> = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapa' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceara' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espirito Santo' },
  { code: 'GO', name: 'Goias' },
  { code: 'MA', name: 'Maranhao' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Para' },
  { code: 'PB', name: 'Paraiba' },
  { code: 'PR', name: 'Parana' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piaui' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondonia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'Sao Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

const validStateCodes = new Set(BRAZIL_STATE_OPTIONS.map((state) => state.code));
const cityCache = new Map<string, string[]>();
const cityRequests = new Map<string, Promise<string[]>>();

export const normalizeBrazilStateCode = (value: string) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);

export const isBrazilStateCode = (value: string) =>
  validStateCodes.has(normalizeBrazilStateCode(value));

export const fetchCitiesByState = async (stateCode: string): Promise<string[]> => {
  const normalizedState = normalizeBrazilStateCode(stateCode);
  if (!isBrazilStateCode(normalizedState)) return [];

  const cached = cityCache.get(normalizedState);
  if (cached) return cached;

  const pending = cityRequests.get(normalizedState);
  if (pending) return pending;

  const request = fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedState}/municipios`
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Nao foi possivel carregar cidades.');
      }

      const payload = (await response.json()) as IbgeCityRow[];
      if (!Array.isArray(payload)) return [];

      const uniqueCities = Array.from(
        new Set(
          payload
            .map((city) => String(city.nome ?? '').trim())
            .filter((cityName) => cityName.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

      cityCache.set(normalizedState, uniqueCities);
      return uniqueCities;
    })
    .catch(() => [])
    .finally(() => {
      cityRequests.delete(normalizedState);
    });

  cityRequests.set(normalizedState, request);
  return request;
};
