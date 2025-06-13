import FoundationModels

@objc(NogoLLM)
class NogoLLM: NSObject {
  @objc func translate(_ text: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let model = try? LLMModel(configuration: .default) else {
      rejecter("no_model", "On-device LLM unavailable", nil)
      return
    }
    model.generate(text: text) { result in
      switch result {
      case .success(let out):
        resolver(out)
      case .failure(let err):
        rejecter("llm_error", err.localizedDescription, err)
      }
    }
  }
} 