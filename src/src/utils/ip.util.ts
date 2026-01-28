export const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // 첫 번째 IP 추출 (가장 왼쪽이 원본 클라이언트 IP)
    const clientIp = forwardedFor.split(',')[0].trim();
    // 40자 제한 (IPv6 포함 안전장치)
    return clientIp.substring(0, 40);
  }
  return '127.0.0.1';
};
