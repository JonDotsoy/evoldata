build: build-esm build-types

build-esm:
	bunx tsc --project tsconfig.esm.json --outDir lib/esm

build-types:
	bunx tsc --project tsconfig.types.json --outDir lib/types
