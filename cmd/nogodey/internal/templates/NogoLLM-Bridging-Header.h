#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NogoLLM, NSObject)
RCT_EXTERN_METHOD(translate:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end