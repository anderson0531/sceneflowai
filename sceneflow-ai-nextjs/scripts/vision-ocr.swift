import Foundation
import Vision
import AppKit

struct OcrBox: Codable {
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
    let confidence: Float
}

guard CommandLine.arguments.count >= 2 else {
    fputs("Usage: vision-ocr <image-path>\n", stderr)
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: imagePath)
guard let nsImage = NSImage(contentsOf: url),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Failed to load image: \(imagePath)\n", stderr)
    exit(1)
}

let imgW = Double(cgImage.width)
let imgH = Double(cgImage.height)

var results: [OcrBox] = []
let request = VNRecognizeTextRequest { req, err in
    if let err = err {
        fputs("Vision error: \(err)\n", stderr)
        exit(1)
    }
    guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
    for obs in observations {
        guard let top = obs.topCandidates(1).first else { continue }
        let bb = obs.boundingBox
        let x = bb.origin.x * imgW
        let y = (1.0 - bb.origin.y - bb.size.height) * imgH
        let w = bb.size.width * imgW
        let h = bb.size.height * imgH
        results.append(OcrBox(text: top.string, x: x, y: y, w: w, h: h, confidence: top.confidence))
    }
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]
request.minimumTextHeight = 0.003

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let encoder = JSONEncoder()
let data = try encoder.encode(results)
if let json = String(data: data, encoding: .utf8) {
    print(json)
}
