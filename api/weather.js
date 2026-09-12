const ULTRA_SRT_NCST_URL =
  'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
const VILAGE_FCST_URL =
  'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const VILAGE_RELEASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

class KmaResponseError extends Error {}
class UpstreamError extends Error {}

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function toKstClock(date) {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function formatDate(kstClock) {
  return [
    kstClock.getUTCFullYear(),
    pad(kstClock.getUTCMonth() + 1),
    pad(kstClock.getUTCDate()),
  ].join('');
}

function formatBase(kstClock, hour) {
  return {
    baseDate: formatDate(kstClock),
    baseTime: `${pad(hour)}00`,
  };
}

export function getUltraSrtBase(now = new Date()) {
  const kstClock = toKstClock(now);

  if (kstClock.getUTCMinutes() < 40) {
    kstClock.setUTCHours(kstClock.getUTCHours() - 1);
  }

  return formatBase(kstClock, kstClock.getUTCHours());
}

export function getVilageBase(now = new Date()) {
  const kstClock = toKstClock(now);

  for (let index = VILAGE_RELEASE_HOURS.length - 1; index >= 0; index -= 1) {
    const hour = VILAGE_RELEASE_HOURS[index];
    const availableAt = new Date(kstClock);
    availableAt.setUTCHours(hour, 10, 0, 0);

    if (kstClock >= availableAt) {
      return formatBase(kstClock, hour);
    }
  }

  kstClock.setUTCDate(kstClock.getUTCDate() - 1);
  return formatBase(kstClock, 23);
}

function normalizeServiceKey(serviceKey) {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}

function createKmaUrl(endpoint, serviceKey, base, nx, ny) {
  const url = new URL(endpoint);
  url.searchParams.set('serviceKey', normalizeServiceKey(serviceKey));
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '1000');
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('base_date', base.baseDate);
  url.searchParams.set('base_time', base.baseTime);
  url.searchParams.set('nx', String(nx));
  url.searchParams.set('ny', String(ny));
  return url;
}

async function fetchKma(endpoint, serviceKey, base, nx, ny) {
  const response = await fetch(
    createKmaUrl(endpoint, serviceKey, base, nx, ny),
  );
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new UpstreamError('기상청 응답을 JSON으로 읽지 못했습니다.');
  }

  const header = payload?.response?.header;
  if (header?.resultCode !== '00') {
    throw new KmaResponseError(
      typeof header?.resultMsg === 'string'
        ? header.resultMsg
        : '기상청 API가 오류를 반환했습니다.',
    );
  }

  if (!response.ok) {
    throw new UpstreamError(`기상청 API HTTP 오류: ${response.status}`);
  }

  const items = payload?.response?.body?.items?.item;
  if (!items) {
    throw new UpstreamError('기상청 응답에 예보 항목이 없습니다.');
  }

  return Array.isArray(items) ? items : [items];
}

function precipitationType(value) {
  const code = Number(value);

  if (code === 5) return 1;
  if (code === 6) return 2;
  if (code === 7) return 3;
  return Number.isInteger(code) && code >= 0 && code <= 4 ? code : 0;
}

function toIsoTime(date, time) {
  if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) {
    throw new UpstreamError('기상청 응답의 날짜 형식이 올바르지 않습니다.');
  }

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`;
}

function finiteNumber(value, category) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new UpstreamError(`기상청 ${category} 값이 올바르지 않습니다.`);
  }
  return number;
}

function createCurrent(items, requestedBase) {
  const byCategory = new Map(
    items.map((item) => [item.category, item.obsrValue]),
  );
  const firstItem = items[0];
  const baseDate = String(firstItem?.baseDate ?? requestedBase.baseDate);
  const baseTime = pad(firstItem?.baseTime ?? requestedBase.baseTime, 4);

  if (!byCategory.has('T1H') || !byCategory.has('REH')) {
    throw new UpstreamError('초단기실황에 T1H 또는 REH가 없습니다.');
  }

  return {
    time: toIsoTime(baseDate, baseTime),
    tempC: finiteNumber(byCategory.get('T1H'), 'T1H'),
    humidity: finiteNumber(byCategory.get('REH'), 'REH'),
    precipitationType: precipitationType(byCategory.get('PTY') ?? 0),
  };
}

function currentHourKey(now) {
  const kstClock = toKstClock(now);
  return `${formatDate(kstClock)}${pad(kstClock.getUTCHours())}00`;
}

function createHourly(items, now) {
  const grouped = new Map();

  for (const item of items) {
    const date = String(item.fcstDate ?? '');
    const time = pad(item.fcstTime ?? '', 4);
    if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) {
      continue;
    }

    const key = `${date}${time}`;
    const point = grouped.get(key) ?? { date, time };

    if (item.category === 'TMP') {
      point.tempC = Number(item.fcstValue);
    } else if (item.category === 'REH') {
      point.humidity = Number(item.fcstValue);
    } else if (item.category === 'PTY') {
      point.precipitationType = precipitationType(item.fcstValue);
    }

    grouped.set(key, point);
  }

  const startKey = currentHourKey(now);

  return [...grouped.entries()]
    .filter(
      ([key, point]) =>
        key >= startKey &&
        Number.isFinite(point.tempC) &&
        Number.isFinite(point.humidity) &&
        point.precipitationType !== undefined,
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 72)
    .map(([, point]) => ({
      time: toIsoTime(point.date, point.time),
      tempC: point.tempC,
      humidity: point.humidity,
      precipitationType: point.precipitationType,
    }));
}

function queryNumber(value) {
  const singleValue = Array.isArray(value) ? value[0] : value;
  if (singleValue === undefined || singleValue === '') {
    return null;
  }

  const number = Number(singleValue);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'GET 요청만 지원합니다.' });
    }

    const nx = queryNumber(request.query?.nx);
    const ny = queryNumber(request.query?.ny);
    if (nx === null || ny === null) {
      return response.status(400).json({
        error: 'nx와 ny는 0보다 큰 정수여야 합니다.',
      });
    }

    const serviceKey = process.env.KMA_KEY;
    if (!serviceKey) {
      return response.status(500).json({
        error: 'KMA_KEY 환경변수가 설정되지 않았습니다.',
      });
    }

    const now = new Date();
    const ultraBase = getUltraSrtBase(now);
    const vilageBase = getVilageBase(now);
    const [currentItems, forecastItems] = await Promise.all([
      fetchKma(ULTRA_SRT_NCST_URL, serviceKey, ultraBase, nx, ny),
      fetchKma(VILAGE_FCST_URL, serviceKey, vilageBase, nx, ny),
    ]);
    const current = createCurrent(currentItems, ultraBase);
    const hourly = createHourly(forecastItems, now);

    return response.status(200).json({
      location: { label: `격자 ${nx}/${ny}`, nx, ny },
      observedAt: current.time,
      current,
      hourly,
    });
  } catch (error) {
    if (error instanceof KmaResponseError) {
      return response.status(502).send(error.message);
    }

    if (error instanceof UpstreamError) {
      return response.status(502).json({ error: error.message });
    }

    return response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : '날씨 정보를 불러오지 못했습니다.',
    });
  }
}
