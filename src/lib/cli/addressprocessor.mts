export function processAddresses(addresses: string[]): void {
  if (addresses.length === 0) {
    console.error('Error: No blockchain addresses provided.');
    process.exit(1); // Exit with an error code
  }
  
  addresses.forEach(address => console.log(address));
}
