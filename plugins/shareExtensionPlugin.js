const { withXcodeProject } = require('expo/config-plugins');

const withShareExtension = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Add the Share Extension target
    const target = xcodeProject.addTarget('ShareExtension', 'app_extension', 'ShareExtension', `${config.ios?.bundleIdentifier || 'com.yourcompany.kidchef'}.ShareExtension`);

    // Add source files
    xcodeProject.addSourceFile('ios/ShareExtension/ShareViewController.swift', {target: target.uuid});

    // Add resources
    xcodeProject.addResourceFile('ios/ShareExtension/MainInterface.storyboard', {target: target.uuid});
    xcodeProject.addResourceFile('ios/ShareExtension/Info.plist', {target: target.uuid});

    // Set build configurations
    xcodeProject.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', `${config.ios?.bundleIdentifier || 'com.yourcompany.kidchef'}.ShareExtension`, 'Debug', target.productName);
    xcodeProject.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', `${config.ios?.bundleIdentifier || 'com.yourcompany.kidchef'}.ShareExtension`, 'Release', target.productName);
    xcodeProject.addBuildProperty('INFOPLIST_FILE', 'ios/ShareExtension/Info.plist', 'Debug', target.productName);
    xcodeProject.addBuildProperty('INFOPLIST_FILE', 'ios/ShareExtension/Info.plist', 'Release', target.productName);

    // Add framework dependencies
    xcodeProject.addFramework('Social.framework', {target: target.uuid});
    xcodeProject.addFramework('MobileCoreServices.framework', {target: target.uuid});
    xcodeProject.addFramework('UniformTypeIdentifiers.framework', {target: target.uuid});

    return config;
  });
};

module.exports = withShareExtension;