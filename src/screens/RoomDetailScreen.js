import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRoomDetail, addUserToRoom, removeUserFromRoom, addCameraToRoom, removeCameraFromRoom } from '../config/api';
import { getDemoRoomDetail } from '../data/demoData';

export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const [selectedTab, setSelectedTab] = useState('재실 인원');
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [isAddCameraModalVisible, setIsAddCameraModalVisible] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    role: ''
  });
  const [newCamera, setNewCamera] = useState({
    name: '',
    deviceUuid: ''
  });
  const [isSubmittingCamera, setIsSubmittingCamera] = useState(false);
  const [roomDetail, setRoomDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // 오프라인 모드 확인
  useEffect(() => {
    const checkOfflineMode = async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const token = await AsyncStorage.getItem('userToken');
        
        if (!refreshToken || (token && (token.startsWith('ya29.') || token.startsWith('EAAG')))) {
          setIsOfflineMode(true);
        } else {
          setIsOfflineMode(false);
        }
      } catch (error) {
        console.error('오프라인 모드 확인 오류:', error);
        setIsOfflineMode(true);
      }
    };

    checkOfflineMode();
  }, []);

  // Room 세부 정보 로딩
  useEffect(() => {
    loadRoomDetail();
  }, [room.roomId, isOfflineMode]);

  const loadRoomDetail = async () => {
    if (isOfflineMode) {
      // 오프라인 모드일 때는 데모 데이터 사용
      setRoomDetail(getDemoRoomDetail(room.roomId));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 Room 세부 정보 로딩 시작 - Room ID: ${room.roomId}`);
      
      const data = await getRoomDetail(room.roomId);
      setRoomDetail(data);
      console.log('✅ Room 세부 정보 로딩 완료');
      
    } catch (error) {
      console.error('❌ Room 세부 정보 로딩 실패:', error);
      
      Alert.alert(
        '데이터 로딩 실패',
        '서버에서 데이터를 가져올 수 없습니다.\n오프라인 모드로 전환합니다.',
        [
          {
            text: '확인',
            onPress: () => {
              setIsOfflineMode(true);
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 새로고침 함수
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRoomDetail();
    setIsRefreshing(false);
  };

  // Role 번역 함수
  const translateRole = (role) => {
    switch (role) {
      case 'ADMIN': return '관리자';
      case 'EDITOR': return '편집자';
      case 'VIEWER': return '사용자';
      default: return '사용자';
    }
  };

  // 실제 데이터 또는 로딩 상태
  const residents = roomDetail?.members || [];
  const cameras = roomDetail?.cameras || [];
  const roomName = roomDetail?.roomAlias || room.roomAlias || room.name || '구역';
  
  // 화재 감지 중인 카메라와 안전한 카메라 분리
  const fireDetectionCameras = cameras.filter(camera => camera.isFireOccurring);
  const safeCameras = cameras.filter(camera => !camera.isFireOccurring);

  const handleInvite = () => {
    setIsAddMemberModalVisible(true);
  };

  const handleAddCamera = () => {
    setIsAddCameraModalVisible(true);
  };

  const handleSubmitMember = async () => {
    if (!newMember.email || !newMember.role) {
      Alert.alert('입력 오류', '이메일과 역할을 모두 입력해주세요.');
      return;
    }

    // role을 서버 형식으로 변환
    const roleMapping = {
      '편집자': 'EDITOR',
      '사용자': 'VIEWER',
    };
    const serverRole = roleMapping[newMember.role];

    if (!serverRole) {
      Alert.alert('입력 오류', '올바른 역할을 선택해주세요.');
      return;
    }

    try {
      setIsSubmittingMember(true);
      console.log('➕ Room에 사용자 추가 요청...');
      
      await addUserToRoom(room.roomId, newMember.email, serverRole);
      
      Alert.alert(
        '인원 추가 완료',
        `${newMember.email}님이 추가되었습니다.`,
        [
          {
            text: '확인',
            onPress: async () => {
              // 모달 닫고 초기화
              setIsAddMemberModalVisible(false);
              setNewMember({ email: '', role: '' });
              
              // Room 세부 정보 새로고침
              await loadRoomDetail();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Room에 사용자 추가 실패:', error);
      Alert.alert(
        '인원 추가 실패',
        error.message || '서버에 사용자를 추가할 수 없습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleCancelMember = () => {
    setIsAddMemberModalVisible(false);
    setNewMember({ email: '', role: '' });
  };

  const handleSubmitCamera = async () => {
    if (!newCamera.name || !newCamera.deviceUuid) {
      Alert.alert('입력 오류', '카메라 이름과 카메라 ID를 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmittingCamera(true);
      console.log('➕ Room에 카메라 추가 요청...');
      
      await addCameraToRoom(room.roomId, newCamera.deviceUuid, newCamera.name);
      
      Alert.alert(
        '카메라 추가 완료',
        `${newCamera.name}이(가) 추가되었습니다.`,
        [
          {
            text: '확인',
            onPress: async () => {
              // 모달 닫고 초기화
              setIsAddCameraModalVisible(false);
              setNewCamera({ name: '', deviceUuid: '' });
              
              // Room 세부 정보 새로고침
              await loadRoomDetail();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Room에 카메라 추가 실패:', error);
      Alert.alert(
        '카메라 추가 실패',
        error.message || '서버에 카메라를 추가할 수 없습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSubmittingCamera(false);
    }
  };

  const handleCancelCamera = () => {
    setIsAddCameraModalVisible(false);
    setNewCamera({ name: '', deviceUuid: '' });
  };

  const handleDeleteResident = (resident) => {
    Alert.alert(
      '멤버 삭제',
      `${resident.nickname}님을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Room에서 사용자 삭제 요청...');
              
              await removeUserFromRoom(room.roomId, resident.userId);
              
              Alert.alert(
                '삭제 완료',
                `${resident.nickname}님이 삭제되었습니다.`,
                [
                  {
                    text: '확인',
                    onPress: async () => {
                      // Room 세부 정보 새로고침
                      await loadRoomDetail();
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error('❌ Room에서 사용자 삭제 실패:', error);
              Alert.alert(
                '삭제 실패',
                error.message || '서버에서 사용자를 삭제할 수 없습니다. 다시 시도해주세요.'
              );
            }
          }
        }
      ]
    );
  };

  const handleDeleteCamera = (camera) => {
    Alert.alert(
      '카메라 삭제',
      `${camera.cameraEdgeAlias || camera.name}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Room에서 카메라 삭제 요청...');
              
              // cameraId를 cameraEdgeId로 사용
              await removeCameraFromRoom(room.roomId, camera.cameraId);
              
              Alert.alert(
                '삭제 완료',
                `${camera.cameraEdgeAlias || camera.name}이(가) 삭제되었습니다.`,
                [
                  {
                    text: '확인',
                    onPress: async () => {
                      // Room 세부 정보 새로고침
                      await loadRoomDetail();
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error('❌ Room에서 카메라 삭제 실패:', error);
              Alert.alert(
                '삭제 실패',
                error.message || '서버에서 카메라를 삭제할 수 없습니다. 다시 시도해주세요.'
              );
            }
          }
        }
      ]
    );
  };

  const handleEditResident = (resident) => {
    Alert.alert('수정', `${resident.name}의 정보를 수정합니다.`);
  };

  const handleEditCamera = (camera) => {
    Alert.alert('수정', `${camera.name}의 정보를 수정합니다.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF3B30" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{roomName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>카메라</Text>
          <Text style={styles.statValue}>{cameras.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>인원</Text>
          <Text style={styles.statValue}>{residents.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>화재 감지</Text>
          <Text style={[styles.statValue, styles.dangerText]}>
            {fireDetectionCameras.length}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === '재실 인원' && styles.activeTab]}
          onPress={() => setSelectedTab('재실 인원')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, selectedTab === '재실 인원' && styles.activeTabText]}>
              👤 재실 인원
            </Text>
            <Text style={[styles.tabCount, selectedTab === '재실 인원' && styles.activeTabCount]}>
              {residents.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === '카메라 목록' && styles.activeTab]}
          onPress={() => setSelectedTab('카메라 목록')}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, selectedTab === '카메라 목록' && styles.activeTabText]}>
              카메라 목록
            </Text>
            <Text style={[styles.tabCount, selectedTab === '카메라 목록' && styles.activeTabCount]}>
              {cameras.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#FF3B30']}
            tintColor="#FF3B30"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        ) : selectedTab === '재실 인원' ? (
          <>
            {/* Residents List */}
            {residents.length > 0 ? (
              residents.map((resident) => (
                <View key={resident.userId} style={styles.residentCard}>
                  <View style={styles.residentInfo}>
                    <View>
                      <View style={styles.residentNameRow}>
                        <Text style={styles.residentName}>{resident.nickname}</Text>
                        <View style={[
                          styles.roleBadge, 
                          resident.role === 'ADMIN' ? styles.adminBadge : 
                          resident.role === 'EDITOR' ? styles.editorBadge : styles.userBadge
                        ]}>
                          <Text style={styles.roleText}>{translateRole(resident.role)}</Text>
                        </View>
                      </View>
                      <Text style={styles.residentEmail}>{resident.email}</Text>
                    </View>
                  </View>
                  <View style={styles.residentActions}>
                    <TouchableOpacity 
                      style={styles.deleteIconButton}
                      onPress={() => handleDeleteResident(resident)}
                    >
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 인원이 없습니다</Text>
                <Text style={styles.emptySubText}>새로운 인원을 추가해보세요</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Fire Detection Cameras Section - First */}
            {fireDetectionCameras.length > 0 && (
              <>
                <View style={styles.cameraSectionHeader}>
                  <Text style={styles.cameraSectionIconDanger}>⚠️</Text>
                  <Text style={styles.cameraSectionTitleDanger}>화재 감지 중</Text>
                </View>

                {fireDetectionCameras.map((camera) => (
                  <TouchableOpacity 
                    key={camera.cameraId} 
                    style={[styles.cameraCard, styles.cameraCardError]}
                    onPress={() => navigation.navigate('FireAlertDetail', { camera, room: roomDetail })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cameraHeader}>
                      <View style={styles.cameraIconContainer}>
                        <Text style={styles.cameraIcon}>📷</Text>
                      </View>
                      <View style={styles.cameraInfo}>
                        <Text style={styles.cameraName}>{camera.cameraEdgeAlias}</Text>
                        <Text style={styles.cameraLocation}>{camera.locationFloor}</Text>
                      </View>
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorBadgeText}>위험</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteIconButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteCamera(camera);
                        }}
                      >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.errorMessageBox}>
                      <Text style={styles.errorIcon}>⚠️</Text>
                      <Text style={styles.errorMessage}>즉시 확인이 필요합니다</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Safe Cameras Section - Second */}
            {safeCameras.length > 0 && (
              <>
                <View style={styles.cameraSectionHeader}>
                  <Text style={styles.cameraSectionIconSafe}>✓</Text>
                  <Text style={styles.cameraSectionTitleSafe}>안전</Text>
                </View>

                {safeCameras.map((camera) => (
                  <TouchableOpacity 
                    key={camera.cameraId} 
                    style={styles.cameraCard}
                    onPress={() => navigation.navigate('FireEventHistory', { camera, room: roomDetail })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cameraHeader}>
                      <View style={styles.cameraIconContainer}>
                        <Text style={styles.cameraIcon}>📷</Text>
                      </View>
                      <View style={styles.cameraInfo}>
                        <Text style={styles.cameraName}>{camera.cameraEdgeAlias}</Text>
                        <Text style={styles.cameraLocation}>{camera.locationFloor}</Text>
                      </View>
                      <View style={styles.safeBadge}>
                        <Text style={styles.safeBadgeText}>안전</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteIconButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteCamera(camera);
                        }}
                      >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Empty State for Cameras */}
            {cameras.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 카메라가 없습니다</Text>
                <Text style={styles.emptySubText}>새로운 카메라를 추가해보세요</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={selectedTab === '재실 인원' ? handleInvite : handleAddCamera}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAddMemberModalVisible}
        onRequestClose={handleCancelMember}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>인원 추가</Text>
              <TouchableOpacity onPress={handleCancelMember}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>새로운 인원 정보를 입력하세요.</Text>

            {/* Form Fields */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>이메일</Text>
              <TextInput
                style={styles.textInput}
                placeholder="email@example.com"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                value={newMember.email}
                onChangeText={(text) => setNewMember({...newMember, email: text})}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>역할</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity 
                  style={[
                    styles.roleOption,
                    newMember.role === '편집자' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewMember({...newMember, role: '편집자'})}
                >
                  <Text style={[
                    styles.roleOptionText,
                    newMember.role === '편집자' && styles.roleOptionTextSelected
                  ]}>편집자</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.roleOption,
                    newMember.role === '사용자' && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewMember({...newMember, role: '사용자'})}
                >
                  <Text style={[
                    styles.roleOptionText,
                    newMember.role === '사용자' && styles.roleOptionTextSelected
                  ]}>사용자</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={[styles.submitButton, isSubmittingMember && styles.submitButtonDisabled]}
              onPress={handleSubmitMember}
              disabled={isSubmittingMember}
            >
              {isSubmittingMember ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>추가</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelMember}
              disabled={isSubmittingMember}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Camera Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAddCameraModalVisible}
        onRequestClose={handleCancelCamera}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>카메라 추가</Text>
              <TouchableOpacity onPress={handleCancelCamera}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>새로운 카메라 정보를 입력하세요.</Text>

            {/* Form Fields */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>카메라 이름</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 카메라 4"
                placeholderTextColor="#999999"
                value={newCamera.name}
                onChangeText={(text) => setNewCamera({...newCamera, name: text})}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>카메라 ID</Text>
              <TextInput
                style={styles.textInput}
                placeholder="예: 1234"
                placeholderTextColor="#999999"
                value={newCamera.deviceUuid}
                onChangeText={(text) => setNewCamera({...newCamera, deviceUuid: text})}
              />
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={[styles.submitButton, isSubmittingCamera && styles.submitButtonDisabled]}
              onPress={handleSubmitCamera}
              disabled={isSubmittingCamera}
            >
              {isSubmittingCamera ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>추가</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelCamera}
              disabled={isSubmittingCamera}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  statLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  dangerText: {
    color: '#FF3B30',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF3B30',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    color: '#999999',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#000000',
  },
  tabCount: {
    fontSize: 15,
    color: '#999999',
  },
  activeTabCount: {
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cameraSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  cameraSectionIconDanger: {
    fontSize: 16,
    color: '#FF3B30',
  },
  cameraSectionTitleDanger: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  cameraSectionIconSafe: {
    fontSize: 16,
    color: '#34C759',
  },
  cameraSectionTitleSafe: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  residentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  residentInfo: {
    flex: 1,
  },
  residentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminBadge: {
    backgroundColor: '#34C759',
  },
  userBadge: {
    backgroundColor: '#007AFF',
  },
  editorBadge: {
    backgroundColor: '#5856D6',
  },
  roleText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  residentEmail: {
    fontSize: 14,
    color: '#666666',
  },
  residentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteIconButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 20,
  },
  cameraCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraCardError: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cameraIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 20,
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  cameraLocation: {
    fontSize: 13,
    color: '#666666',
  },
  errorBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  errorBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  safeBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  safeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  errorMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE5E5',
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#FF3B30',
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '300',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  formField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#FF9966',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666666',
  },
});