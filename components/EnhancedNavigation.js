/**
 * Navigation Improvements
 * Enhanced Tab Navigation, Breadcrumbs, and Navigation Drawer with animations
 */

import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  ToplessScroll,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { ThemeContext } from '../theme/enhancedTheme';
import { useFadeIn, useSlideIn } from './animations';
import { triggerHaptic } from './microInteractions';

/**
 * Enhanced Tab Navigation
 * With underline animation and active states
 */
export const EnhancedTabBar = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default', // default, minimal, pill
}) => {
  const { theme } = useContext(ThemeContext);
  const fadeAnim = useFadeIn({ duration: 300 });

  const handleTabPress = (index) => {
    triggerHaptic('light');
    onTabChange?.(index);
  };

  const variantStyles = {
    default: {
      backgroundColor: theme.colors.background.primary,
      borderBottomColor: theme.colors.border.light,
      borderBottomWidth: 1,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
    },
    pill: {
      backgroundColor: theme.colors.background.hover,
      borderRadius: 12,
      margin: 8,
    },
  };

  return (
    <View style={[styles.tabBar, variantStyles[variant]]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <TouchableOpacity
              key={`tab-${index}`}
              onPress={() => handleTabPress(index)}
              style={[
                styles.tabItem,
                {
                  paddingHorizontal: variant === 'pill' ? 16 : 12,
                  borderRadius: variant === 'pill' ? 8 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive
                      ? theme.colors.primary.default
                      : theme.colors.text.secondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
                {tab.badge && (
                  <Text
                    style={{
                      marginLeft: 4,
                      backgroundColor: theme.colors.error.default,
                      color: '#fff',
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      overflow: 'hidden',
                    }}
                  >
                    {tab.badge}
                  </Text>
                )}
              </Text>
              {isActive && variant === 'default' && (
                <View
                  style={{
                    height: 2,
                    backgroundColor: theme.colors.primary.default,
                    marginTop: 8,
                    borderRadius: 2,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

/**
 * Enhanced Breadcrumbs
 * With separators and navigation
 */
export const EnhancedBreadcrumbs = ({
  items,
  onNavigate,
  separator = '/',
  variant = 'default', // default, dots, arrow
}) => {
  const { theme } = useContext(ThemeContext);

  const separators = {
    '/': '/',
    'dots': '•',
    'arrow': '›',
    'backslash': '\\',
  };

  const getSeparator = () => {
    if (variant === 'dots') return separators.dots;
    if (variant === 'arrow') return separators.arrow;
    return separator || separators['/'];
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.breadcrumbs}
    >
      {items.map((item, index) => (
        <View key={`breadcrumb-${index}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (item.onPress) {
                triggerHaptic('light');
                item.onPress?.();
              }
            }}
            disabled={index === items.length - 1}
            style={{ opacity: index === items.length - 1 ? 0.5 : 1 }}
          >
            <Text
              style={[
                styles.breadcrumbText,
                {
                  color:
                    index === items.length - 1
                      ? theme.colors.primary.default
                      : theme.colors.text.secondary,
                  fontWeight: index === items.length - 1 ? '600' : '400',
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
          {index < items.length - 1 && (
            <Text
              style={[
                styles.breadcrumbText,
                { color: theme.colors.text.disabled, marginHorizontal: 6 },
              ]}
            >
              {getSeparator()}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

/**
 * Enhanced Navigation Drawer
 * With slide animation and sections
 */
export const EnhancedDrawer = ({
  visible,
  items,
  onItemPress,
  onClose,
  header,
}) => {
  const { theme } = useContext(ThemeContext);
  const slideAnim = useSlideIn({ direction: 'left', duration: 300 });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.drawerOverlay}>
      <TouchableOpacity
        style={styles.drawerBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.drawerContent,
          { backgroundColor: theme.colors.background.primary },
          animatedStyle,
        ]}
      >
        {header && (
          <View style={[styles.drawerHeader, { borderBottomColor: theme.colors.border.light }]}>
            {header}
          </View>
        )}
        <ScrollView style={{ flex: 1 }}>
          {items.map((item, index) => (
            <React.Fragment key={`drawer-item-${index}`}>
              {item.section && (
                <Text
                  style={[
                    styles.drawerSection,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  {item.section}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  onItemPress?.(item);
                  onClose?.();
                }}
                style={[
                  styles.drawerItem,
                  {
                    backgroundColor: item.active
                      ? theme.colors.background.hover
                      : 'transparent',
                  },
                ]}
              >
                {item.icon && (
                  <View style={{ marginRight: 12, width: 24 }}>{item.icon}</View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.drawerItemText,
                      {
                        color: item.active
                          ? theme.colors.primary.default
                          : theme.colors.text.primary,
                        fontWeight: item.active ? '600' : '400',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.description && (
                    <Text
                      style={[
                        styles.drawerItemDescription,
                        { color: theme.colors.text.secondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
                {item.badge && (
                  <View
                    style={{
                      backgroundColor: theme.colors.error.default,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                      {item.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

/**
 * Enhanced Navigation Header
 * With back button and title
 */
export const EnhancedNavigationHeader = ({
  title,
  subtitle,
  onBackPress,
  rightActions,
  variant = 'default', // default, minimal, large
  backgroundColor,
}) => {
  const { theme } = useContext(ThemeContext);
  const fadeAnim = useFadeIn({ duration: 300 });

  const variantStyles = {
    default: {
      paddingTop: Platform.OS === 'ios' ? 50 : 10,
      paddingBottom: 16,
      paddingHorizontal: 16,
    },
    minimal: {
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 16,
    },
    large: {
      paddingTop: Platform.OS === 'ios' ? 50 : 16,
      paddingBottom: 32,
      paddingHorizontal: 16,
    },
  };

  return (
    <View
      style={[
        styles.navigationHeader,
        variantStyles[variant],
        {
          backgroundColor: backgroundColor || theme.colors.background.primary,
          borderBottomColor: theme.colors.border.light,
          borderBottomWidth: 1,
        },
      ]}
    >
      <View style={styles.navigationHeaderContent}>
        {onBackPress && (
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onBackPress?.();
            }}
            style={styles.backButton}
          >
            <Text style={[{ color: theme.colors.primary.default, fontSize: 24 }]}>
              ←
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.navigationHeaderTitle,
              {
                color: theme.colors.text.primary,
                fontSize: variant === 'large' ? 28 : 18,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.navigationHeaderSubtitle,
                { color: theme.colors.text.secondary },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {rightActions && (
          <View style={styles.navigationHeaderActions}>
            {rightActions}
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  tabBar: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingVertical: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  tabText: {
    fontSize: 14,
  },
  breadcrumbs: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  breadcrumbText: {
    fontSize: 14,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    zIndex: 1000,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    width: '80%',
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  drawerSection: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  drawerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  drawerItemDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  navigationHeader: {
    paddingHorizontal: 16,
  },
  navigationHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 8,
    minWidth: 40,
  },
  navigationHeaderTitle: {
    fontWeight: '700',
  },
  navigationHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  navigationHeaderActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
});

export default {
  EnhancedTabBar,
  EnhancedBreadcrumbs,
  EnhancedDrawer,
  EnhancedNavigationHeader,
};
