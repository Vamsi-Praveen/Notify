export function ipToLong(ip) {
  return ip
    .split('.')
    .map(Number)
    .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

export function isIpInCidr(ip, cidr) {
  const [range, bits = '32'] = cidr.split('/');
  const maskBits = parseInt(bits, 10);

  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);

  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

export function isIpAllowed(ip, rules = []) {
  return rules.some(rule => {
    if (rule.includes('/')) {
      return isIpInCidr(ip, rule);
    }
    return rule === ip;
  });
}
