import importlib, traceback
importlib.invalidate_caches()
try:
    import main
    print('IMPORT_OK')
except Exception:
    traceback.print_exc()
    raise SystemExit(1)
