"""Maintainer-only WOFF2 conversion; never subsets or changes font tables.

Install fonttools==4.61.1 and brotli==1.2.0 in a separate Python environment.
Run with --write to regenerate the runtime asset; otherwise verify it.
"""
import argparse
import hashlib
import io
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import compress

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'examples/labs/fonts/NotoSans-variable.ttf'
TARGET = ROOT / 'src/ui/fonts/NotoSans-variable.woff2'
SOURCE_HASH = 'bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d'


def verify(payload):
    original = TTFont(SOURCE, recalcTimestamp=False)
    restored = TTFont(io.BytesIO(payload), recalcTimestamp=False)
    assert set(original.reader.keys()) == set(restored.reader.keys())
    for tag in original.reader.keys():
        a, b = bytearray(original.reader[tag]), bytearray(restored.reader[tag])
        if tag == 'head':
            # Container checksum changes; WOFF2 sets the lossless-transform flag.
            a[8:12] = b[8:12] = bytes(4)
            a[16:18] = (int.from_bytes(a[16:18], 'big') & ~0x800).to_bytes(2, 'big')
            b[16:18] = (int.from_bytes(b[16:18], 'big') & ~0x800).to_bytes(2, 'big')
        assert a == b, f'Font table changed: {tag}'
    print(f'Verified {len(original.reader.keys())} tables, '
          f'{original["maxp"].numGlyphs} glyphs, {len(original.getBestCmap())} code points; '
          f'axes: {[axis.axisTag for axis in original["fvar"].axes]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_HASH
    if args.write:
        output = io.BytesIO()
        # No glyf/loca preprocessing: every outline/hinting/variation table stays exact.
        compress(SOURCE, output, transform_tables=set())
        payload = output.getvalue()
        verify(payload)
        TARGET.write_bytes(payload)
    else:
        payload = TARGET.read_bytes()
        verify(payload)
    print(f'{SOURCE.stat().st_size} -> {len(payload)} bytes; SHA-256 {hashlib.sha256(payload).hexdigest()}')
