import Carbon
import Foundation

func cfString(_ src: TISInputSource, _ key: CFString) -> String {
  guard let ptr = TISGetInputSourceProperty(src, key) else { return "" }
  return Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
}

func sourceID(_ src: TISInputSource) -> String { cfString(src, kTISPropertyInputSourceID) }
func sourceName(_ src: TISInputSource) -> String { cfString(src, kTISPropertyLocalizedName) }
func bundleID(_ src: TISInputSource) -> String { cfString(src, kTISPropertyBundleID) }
func modeID(_ src: TISInputSource) -> String { cfString(src, kTISPropertyInputModeID) }

func currentSource() -> TISInputSource? {
  TISCopyCurrentKeyboardInputSource()?.takeRetainedValue()
}

func findByID(_ id: String) -> TISInputSource? {
  let filter = [kTISPropertyInputSourceID as String: id] as CFDictionary
  if let list = TISCreateInputSourceList(filter, false)?.takeRetainedValue() as? [TISInputSource], let src = list.first {
    return src
  }
  if let list = TISCreateInputSourceList(filter, true)?.takeRetainedValue() as? [TISInputSource], let src = list.first {
    return src
  }
  return nil
}

func findByBundle(_ bundle: String) -> TISInputSource? {
  let filter = [kTISPropertyBundleID as String: bundle] as CFDictionary
  if let list = TISCreateInputSourceList(filter, false)?.takeRetainedValue() as? [TISInputSource] {
    return list.first { sourceID($0).isEmpty == false }
  }
  if let list = TISCreateInputSourceList(filter, true)?.takeRetainedValue() as? [TISInputSource] {
    return list.first { sourceID($0).isEmpty == false }
  }
  return nil
}

func selectSource(_ src: TISInputSource) -> Int32 {
  TISEnableInputSource(src)
  return TISSelectInputSource(src)
}

func printCurrent() {
  guard let src = currentSource() else { return }
  print("id=\(sourceID(src))")
  print("name=\(sourceName(src))")
  print("bundle=\(bundleID(src))")
  print("mode=\(modeID(src))")
}

let args = Array(CommandLine.arguments.dropFirst())
let cmd = args.first ?? "current"

switch cmd {
case "current":
  printCurrent()
case "list":
  let includeAll = args.contains("--all")
  if let list = TISCreateInputSourceList(nil, includeAll)?.takeRetainedValue() as? [TISInputSource] {
    for src in list {
      print("\(sourceID(src))\t\(bundleID(src))\t\(sourceName(src))")
    }
  }
case "select":
  guard let id = args.dropFirst().first else {
    fputs("usage: ime select <id>\n", stderr)
    exit(2)
  }
  guard let src = findByID(id) else {
    fputs("not found: \(id)\n", stderr)
    exit(1)
  }
  exit(selectSource(src) == noErr ? 0 : 1)
case "select-bundle":
  guard let bundle = args.dropFirst().first else {
    fputs("usage: ime select-bundle <bundle-id>\n", stderr)
    exit(2)
  }
  guard let src = findByBundle(bundle) else {
    fputs("not found bundle: \(bundle)\n", stderr)
    exit(1)
  }
  exit(selectSource(src) == noErr ? 0 : 1)
case "english":
  let candidates = ["com.apple.keylayout.ABC", "com.apple.keylayout.US", "com.apple.keylayout.Australian", "com.apple.keylayout.British"]
  for id in candidates {
    if let src = findByID(id) {
      exit(selectSource(src) == noErr ? 0 : 1)
    }
  }
  fputs("no english keyboard found\n", stderr)
  exit(1)
default:
  fputs("usage: ime current | list [--all] | select <id> | select-bundle <id> | english\n", stderr)
  exit(2)
}
