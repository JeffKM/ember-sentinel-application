import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runNetworkDiagnostics } from '../utils/networkTest';
import { getRoomData, getBuildingList, createRoom, deleteRoom } from '../config/api';
import { getDemoRoomData, getDemoBuildings } from '../data/demoData';
import { sendFireSimulationNotification } from '../utils/pushNotification';

export default function HomeScreen({ navigation, onLogout, userRole }) {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newRoom, setNewRoom] = useState({
    buildingId: null,
    buildingName: '',
    floor: '',
    roomNumber: '',
    roomAlias: ''
  });
  const [buildingList, setBuildingList] = useState([]);
  const [isBuildingSelectVisible, setIsBuildingSelectVisible] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // 사용자 정보 및 오프라인 모드 확인
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        const nickname = await AsyncStorage.getItem('userNickname');
        const provider = await AsyncStorage.getItem('loginProvider');
        
        setUserInfo({ email, nickname, provider });
        
        // 오프라인 모드 확인 (서버 JWT 토큰이 없는 경우)
        const token = await AsyncStorage.getItem('userToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        // 서버에서 받은 JWT 토큰이 없거나, refreshToken이 없으면 오프라인 모드
        if (!refreshToken || (token && (token.startsWith('ya29.') || token.startsWith('EAAG')))) {
          // 구글/카카오 원본 토큰만 있고 서버 JWT가 없는 경우 = 오프라인 모드
          setIsOfflineMode(true);
        } else {
          setIsOfflineMode(false);
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      }
    };

    loadUserInfo();
  }, []);

  // Room 데이터 로딩
  useEffect(() => {
    loadRoomData();
  }, [isOfflineMode]);

  const loadRoomData = async () => {
    if (isOfflineMode) {
      // 오프라인 모드일 때는 데모 데이터 사용
      setRoomData(getDemoRoomData());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Room 데이터 로딩 시작...');
      
      const data = await getRoomData();
      setRoomData(data);
      console.log('✅ Room 데이터 로딩 완료');
      
    } catch (error) {
      console.error('❌ Room 데이터 로딩 실패:', error);
      
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
    await loadRoomData();
    setIsRefreshing(false);
  };

  // 네트워크 테스트 함수
  const handleNetworkTest = async () => {
    Alert.alert('네트워크 테스트', '네트워크 상태를 확인합니다. 콘솔을 확인해주세요.');
    
    try {
      const results = await runNetworkDiagnostics();
      
      let message = '네트워크 진단 완료!\n\n';
      message += `기본 네트워크: ${results.basicNetwork ? '✅ 정상' : '❌ 실패'}\n`;
      message += `서버 연결: ${results.serverConnection ? '✅ 정상' : '❌ 실패'}`;
      
      if (results.serverConnection && isOfflineMode) {
        message += '\n\n🎉 서버 연결이 복구되었습니다!';
        
        Alert.alert(
          '네트워크 진단 결과', 
          message,
          [
            { text: '계속 오프라인', style: 'cancel' },
            { 
              text: '온라인 모드로 전환', 
              onPress: () => {
                setIsOfflineMode(false);
                Alert.alert('성공', '온라인 모드로 전환되었습니다!');
              }
            }
          ]
        );
        return;
      }
      
      if (!results.serverConnection && results.basicNetwork) {
        message += '\n\n💡 네이티브 빌드를 시도해보세요:\nexpo run:ios 또는 expo run:android';
      }
      
      Alert.alert('네트워크 진단 결과', message);
    } catch (error) {
      Alert.alert('오류', `네트워크 테스트 중 오류가 발생했습니다: ${error.message}`);
    }
  };
  // 실제 데이터 또는 로딩 상태
  const rooms = roomData?.roomList || [];
  const totalRooms = roomData?.totalRoomCount || 0;
  const totalCameras = roomData?.totalCameraCount || 0;
  const totalFireDetections = roomData?.liveStreamCount || 0;

  const getStatusColor = (fireEventCount) => {
    return fireEventCount > 0 ? '#FF3B30' : '#34C759';
  };

  const getStatusText = (fireEventCount) => {
    return fireEventCount > 0 ? '위험' : '안전';
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return '#34C759';
      case 'editor':
        return '#5856D6';
      case 'viewer':
        return '#007AFF';
      default:
        return '#34C759';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'editor':
        return '편집자';
      case 'viewer':
        return '사용자';
      default:
        return '사용자';
    }
  };

  const canAddRoom = userRole === 'admin' || userRole === 'editor';

  // 빌딩 목록 로딩
  const loadBuildingList = async () => {
    if (isOfflineMode) {
      // 오프라인 모드일 때는 데모 데이터
      setBuildingList(getDemoBuildings());
      return;
    }

    try {
      console.log('🏢 빌딩 목록 로딩 시작...');
      const response = await getBuildingList();
      
      if (response.buildingList && Array.isArray(response.buildingList)) {
        setBuildingList(response.buildingList);
        console.log('✅ 빌딩 목록 로딩 완료:', response.buildingList.length, '개');
      } else {
        console.warn('⚠️ 빌딩 목록 형식이 예상과 다릅니다:', response);
        setBuildingList([]);
      }
    } catch (error) {
      console.error('❌ 빌딩 목록 로딩 실패:', error);
      Alert.alert(
        '오류',
        '빌딩 목록을 불러올 수 없습니다.\n오프라인 모드로 전환합니다.',
        [
          {
            text: '확인',
            onPress: () => {
              setIsOfflineMode(true);
              setBuildingList(getDemoBuildings());
            }
          }
        ]
      );
    }
  };

  const handleAddRoom = async () => {
    if (!canAddRoom) {
      Alert.alert('권한 없음', '사용자는 구역을 추가할 수 없습니다.');
      return;
    }
    
    setIsAddModalVisible(true);
    await loadBuildingList();
  };

  const handleSubmitRoom = async () => {
    // 입력 검증
    if (!newRoom.buildingId || !newRoom.floor || !newRoom.roomNumber || !newRoom.roomAlias) {
      Alert.alert('입력 오류', '건물, 층수, 호실, 별칭을 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmittingRoom(true);
      console.log('➕ Room 추가 요청...');
      
      await createRoom(
        newRoom.buildingId,
        newRoom.roomAlias,
        newRoom.floor,
        newRoom.roomNumber
      );
      
      Alert.alert(
        '구역 추가 완료',
        `${newRoom.buildingName} ${newRoom.floor} ${newRoom.roomNumber}호가 추가되었습니다.`,
        [
          {
            text: '확인',
            onPress: async () => {
              // 모달 닫고 초기화
              setIsAddModalVisible(false);
              setNewRoom({
                buildingId: null,
                buildingName: '',
                floor: '',
                roomNumber: '',
                roomAlias: ''
              });
              
              // Room 목록 새로고침
              await loadRoomData();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Room 추가 실패:', error);
      Alert.alert(
        '구역 추가 실패',
        error.message || '서버에 구역을 추가할 수 없습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddModalVisible(false);
    setIsBuildingSelectVisible(false);
    setNewRoom({
      buildingId: null,
      buildingName: '',
      floor: '',
      roomNumber: '',
      roomAlias: ''
    });
  };

  const handleSelectBuilding = (building) => {
    setNewRoom({
      ...newRoom,
      buildingId: building.id,
      buildingName: building.buildingName,
    });
    setIsBuildingSelectVisible(false);
  };

  const handleDeleteRoom = (room) => {
    if (!canAddRoom) {
      Alert.alert('권한 없음', '사용자는 구역을 삭제할 수 없습니다.');
      return;
    }
    
    Alert.alert(
      '구역 삭제',
      `${room.roomAlias}을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Room 삭제 요청...');
              
              await deleteRoom(room.roomId);
              
              Alert.alert(
                '삭제 완료',
                `${room.roomAlias}이(가) 삭제되었습니다.`,
                [
                  {
                    text: '확인',
                    onPress: async () => {
                      // Room 목록 새로고침
                      await loadRoomData();
                    }
                  }
                ]
              );
              
            } catch (error) {
              console.error('❌ Room 삭제 실패:', error);
              Alert.alert(
                '삭제 실패',
                error.message || '서버에서 구역을 삭제할 수 없습니다. 다시 시도해주세요.'
              );
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF3B30" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>Ember Sentinel</Text>
            <Text style={styles.headerSubtitle}>
              실시간 화재 감지 시스템 {isOfflineMode && '(오프라인 모드)'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              '로그아웃',
              '로그아웃 하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', onPress: onLogout, style: 'destructive' }
              ]
            );
          }}
        >
          <Text style={styles.logoutIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Role Badge */}
      <View style={styles.roleBadgeContainer}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(userRole) }]}>
          <Text style={styles.roleBadgeText}>{getRoleText(userRole)}</Text>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>총 구역</Text>
          <Text style={styles.statValue}>{totalRooms}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>활성 카메라</Text>
          <Text style={styles.statValue}>{totalCameras}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>화재 감지</Text>
          <Text style={[styles.statValue, styles.dangerText]}>{totalFireDetections}</Text>
        </View>
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
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>등록된 구역</Text>
        </View>

        {/* Offline Mode Notice */}
        {isOfflineMode && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              🔄 오프라인 모드로 실행 중입니다
            </Text>
            <Text style={styles.offlineNoticeSubText}>
              서버 연결이 복구되면 새로고침해주세요
            </Text>
            <View style={styles.offlineButtonsRow}>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.networkTestButton}
                  onPress={handleNetworkTest}
                >
                  <Text style={styles.networkTestButtonText}>네트워크 테스트</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.fireSimButton}
                onPress={async () => {
                  const simData = await sendFireSimulationNotification();
                  // 3초 후 FireAlertDetail 화면으로 자동 이동
                  setTimeout(() => {
                    navigation.navigate('FireAlertDetail', {
                      camera: simData.camera,
                      room: simData.room,
                    });
                  }, 3000);
                }}
              >
                <Text style={styles.fireSimButtonText}>🔥 화재 감지 시뮬레이션</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        )}

        {/* Room List */}
        {!isLoading && rooms.map((room) => (
          <TouchableOpacity
            key={room.roomId}
            style={styles.roomCard}
            onPress={() => navigation.navigate('RoomDetail', { room })}
            activeOpacity={0.7}
          >
            <View style={styles.roomHeader}>
              <View style={styles.roomTitleRow}>
                <Text style={styles.roomName}>{room.roomAlias}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(room.fireEventCountPerRoom) }]}>
                  <Text style={styles.statusText}>{getStatusText(room.fireEventCountPerRoom)}</Text>
                </View>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </View>
            
            <View style={styles.roomStatsRow}>
              <View style={styles.roomStatItem}>
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.roomStatText}>{room.cameraCountPerRoom}대</Text>
              </View>
              
              <View style={styles.roomRightSection}>
                {room.fireEventCountPerRoom > 0 && (
                  <View style={styles.fireAlert}>
                    <Text style={styles.fireIcon}>🔥</Text>
                    <Text style={styles.fireAlertText}>화재 {room.fireEventCountPerRoom}건</Text>
                  </View>
                )}
                {canAddRoom && (
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteRoom(room);
                    }}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty State */}
        {!isLoading && rooms.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 구역이 없습니다</Text>
            <Text style={styles.emptySubText}>새로운 구역을 추가해보세요</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button - Only for admin and editor */}
      {canAddRoom && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={handleAddRoom}
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Room Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={handleCancelAdd}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>구역 추가</Text>
              <TouchableOpacity onPress={handleCancelAdd}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>새로운 구역 정보를 입력하세요.</Text>

            {/* Form Fields */}
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              nestedScrollEnabled={true}
            >
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>건물</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setIsBuildingSelectVisible(!isBuildingSelectVisible)}
                >
                  <Text style={[styles.selectInputText, !newRoom.buildingName && styles.selectInputPlaceholder]}>
                    {newRoom.buildingName || '건물을 선택하세요'}
                  </Text>
                  <Text style={[styles.selectArrow, isBuildingSelectVisible && styles.selectArrowUp]}>
                    {isBuildingSelectVisible ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>층수</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 3F"
                  placeholderTextColor="#999999"
                  value={newRoom.floor}
                  onChangeText={(text) => setNewRoom({...newRoom, floor: text})}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>호실</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 305"
                  placeholderTextColor="#999999"
                  value={newRoom.roomNumber}
                  onChangeText={(text) => setNewRoom({...newRoom, roomNumber: text})}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>별칭</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="예: 회의실"
                  placeholderTextColor="#999999"
                  value={newRoom.roomAlias}
                  onChangeText={(text) => setNewRoom({...newRoom, roomAlias: text})}
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity 
                style={[styles.submitButton, isSubmittingRoom && styles.submitButtonDisabled]}
                onPress={handleSubmitRoom}
                disabled={isSubmittingRoom}
              >
                {isSubmittingRoom ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>추가</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelAdd}
                disabled={isSubmittingRoom}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          
          {/* Building Select Dropdown - 모달 컨텐츠 위에 오버레이 */}
          {isBuildingSelectVisible && (
            <TouchableWithoutFeedback onPress={() => setIsBuildingSelectVisible(false)}>
              <View style={styles.buildingSelectDropdownOverlay}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View style={styles.buildingSelectDropdown}>
                    <ScrollView 
                      style={styles.buildingSelectList}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {buildingList.length > 0 ? (
                        buildingList.map((building) => (
                          <TouchableOpacity
                            key={building.id}
                            style={[
                              styles.buildingSelectOption,
                              newRoom.buildingId === building.id && styles.buildingSelectOptionSelected
                            ]}
                            onPress={() => handleSelectBuilding(building)}
                          >
                            <Text style={[
                              styles.buildingSelectOptionText,
                              newRoom.buildingId === building.id && styles.buildingSelectOptionTextSelected
                            ]}>
                              {building.buildingName}
                            </Text>
                            {newRoom.buildingId === building.id && (
                              <Text style={styles.buildingSelectCheckmark}>✓</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.buildingSelectEmptyContainer}>
                          <Text style={styles.buildingSelectEmptyText}>등록된 건물이 없습니다</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          )}
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
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },
  roleBadgeContainer: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statItem: {
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
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  offlineNotice: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  offlineNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  offlineNoticeSubText: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
  },
  offlineButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  networkTestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  networkTestButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fireSimButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  fireSimButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  roomName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowIcon: {
    fontSize: 28,
    color: '#CCCCCC',
    fontWeight: '300',
  },
  roomStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roomStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cameraIcon: {
    fontSize: 16,
  },
  roomStatText: {
    fontSize: 15,
    color: '#666666',
  },
  roomRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fireAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fireIcon: {
    fontSize: 16,
  },
  fireAlertText: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
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
    maxHeight: '90%',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalScrollContent: {
    paddingBottom: 10,
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
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectInputText: {
    fontSize: 15,
    color: '#000000',
    flex: 1,
  },
  selectInputPlaceholder: {
    color: '#999999',
  },
  selectArrow: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  selectArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  buildingSelectDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 200,
    zIndex: 1000,
  },
  buildingSelectDropdown: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 10,
  },
  buildingSelectList: {
    maxHeight: 250,
  },
  buildingSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  buildingSelectOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  buildingSelectOptionText: {
    fontSize: 15,
    color: '#000000',
  },
  buildingSelectOptionTextSelected: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  buildingSelectCheckmark: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  buildingSelectEmptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  buildingSelectEmptyText: {
    fontSize: 14,
    color: '#666666',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});