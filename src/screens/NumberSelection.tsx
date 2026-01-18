import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAppStore } from "../state/appStore";
import { getTranslation } from "../utils/translations";
import PaymentModal from "./PaymentModal";

interface RouteParams {
  vendor: any; // Use the full Vendor type from store
}

export default function NumberSelection() {
  const navigation = useNavigation();
  const route = useRoute();
  const { vendor } = route.params as RouteParams;
  const currency = useAppStore(s => s.currency);
  const language = useAppStore(s => s.language);
  const addGamePlay = useAppStore(s => s.addGamePlay);
  const user = useAppStore(s => s.user);
  const gamePlays = useAppStore(s => s.gamePlays);

  const t = (key: string) => getTranslation(key as any, language);

  // Get enabled states from vendor draws
  const enabledStates = Object.entries(vendor.draws)
    .filter(([, settings]: [string, any]) => settings.enabled)
    .map(([state]) => state);
  
  const [selectedState, setSelectedState] = useState(enabledStates[0] || "GA");
  const [selectedGame, setSelectedGame] = useState("senp");
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [gameSelections, setGameSelections] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const getCurrencySymbol = () => currency === "USD" ? "$" : "G";

  const getGameConfig = (gameType: string) => {
    // Get config from selected state's draw settings
    const stateSettings = vendor.draws[selectedState];
    if (!stateSettings || !stateSettings.enabled) {
      return { enabled: false, min: 0, max: 0 };
    }
    
    const gameSettings = stateSettings.games[gameType];
    if (!gameSettings) {
      return { enabled: false, min: 0, max: 0 };
    }
    
    // Map the field names from the vendor draw settings
    return {
      enabled: gameSettings.enabled,
      min: gameSettings.minAmount || 0,
      max: gameSettings.maxAmount || 0
    };
  };

  const availableGames = [
    { key: "senp", name: t("senp"), description: t("senpDescription"), numbers: 1 },
    { key: "maryaj", name: t("maryaj"), description: t("maryajDescription"), numbers: 2 },
    { key: "loto3", name: t("loto3"), description: t("loto3Description"), numbers: 3 },
    { key: "loto4", name: t("loto4"), description: t("loto4Description"), numbers: 4 },
    { key: "loto5", name: t("loto5"), description: t("loto5Description"), numbers: 5 },
  ].filter(game => getGameConfig(game.key).enabled);

  const getMaxNumber = (gameType: string) => {
    // LOTO games use single digits 0-9, SENP and MARYAJ use 00-99
    return gameType.startsWith("loto") ? 9 : 99;
  };

  const formatNumber = (num: number, gameType: string) => {
    // LOTO games show single digit, others show two digits
    return gameType.startsWith("loto") ? num.toString() : num.toString().padStart(2, "0");
  };

  // Check if player has already bet on a number in this state
  const hasPlayerBetOnNumber = (number: number, state: string): boolean => {
    const formattedNumber = number.toString().padStart(2, '0');

    // Check existing gamePlays from store
    const existingBet = gamePlays.find(play =>
      play.playerId === user?.id &&
      play.vendorId === vendor.id &&
      play.draw === state &&
      play.numbers.some(n => n.toString().padStart(2, '0') === formattedNumber)
    );

    // Also check current game selections in the cart
    const existingSelection = gameSelections.find(selection =>
      selection.state === state &&
      selection.numbers.some((n: number) => n.toString().padStart(2, '0') === formattedNumber)
    );

    return !!existingBet || !!existingSelection;
  };

  // Calculate total bets on a number across all players
  const getTotalBetsOnNumber = (number: number, state: string): number => {
    const formattedNumber = number.toString().padStart(2, '0');

    // Sum all bets from gamePlays
    const totalFromPlays = gamePlays
      .filter(play =>
        play.vendorId === vendor.id &&
        play.draw === state &&
        play.numbers.some(n => n.toString().padStart(2, '0') === formattedNumber)
      )
      .reduce((sum, play) => sum + play.betAmount, 0);

    return totalFromPlays;
  };

  // Get the number limit for a specific number
  const getNumberLimit = (number: number, state: string): number | null => {
    const formattedNumber = number.toString().padStart(2, '0');
    const stateSettings = vendor.draws[state];

    if (!stateSettings?.numberLimits) return null;

    const limit = stateSettings.numberLimits.find((nl: any) => nl.number === formattedNumber);
    return limit ? limit.limit : null;
  };

  // Check if adding this bet would exceed the number limit
  const wouldExceedNumberLimit = (numbers: number[], betAmount: number, state: string): { exceeded: boolean; number?: number; limit?: number; remaining?: number } => {
    for (const number of numbers) {
      const limit = getNumberLimit(number, state);
      if (limit !== null) {
        const currentTotal = getTotalBetsOnNumber(number, state);
        const remaining = limit - currentTotal;

        if (betAmount > remaining) {
          return {
            exceeded: true,
            number,
            limit,
            remaining: Math.max(0, remaining)
          };
        }
      }
    }
    return { exceeded: false };
  };

  // Fixed Number Input Box
  const NumberInput = ({ index, gameType }: { index: number, gameType: string }) => {
    const currentValue = selectedNumbers[index] || 0;
    const maxNum = getMaxNumber(gameType);
    const maxLength = gameType.startsWith("loto") ? 1 : 2;
    
    // Local state for input to handle typing properly
    const [inputText, setInputText] = useState(formatNumber(currentValue, gameType));
    
    const handleNumberChange = (text: string) => {
      // Just update display - don't validate until done typing
      setInputText(text);
      
      // Auto-progress to next input when max length is reached
      if (text.length === maxLength) {
        const numValue = parseInt(text);
        if (!isNaN(numValue) && numValue <= maxNum) {
          const validValue = Math.max(0, Math.min(maxNum, numValue));
          const newNumbers = [...selectedNumbers];
          newNumbers[index] = validValue;
          setSelectedNumbers(newNumbers);
          setInputText(formatNumber(validValue, gameType));
          
          // Move to next input if available
          const gameConfig = availableGames.find(g => g.key === selectedGame);
          if (gameConfig && index < gameConfig.numbers - 1) {
            setTimeout(() => {
              inputRefs.current[index + 1]?.focus();
            }, 100);
          }
        }
      }
    };
    
    const handleInputBlur = () => {
      // Validate only when user finishes typing (keyboard closes)
      if (inputText === "") {
        const newNumbers = [...selectedNumbers];
        newNumbers[index] = 0;
        setSelectedNumbers(newNumbers);
        setInputText("0");
      } else {
        const numValue = parseInt(inputText);
        if (!isNaN(numValue)) {
          const validValue = Math.max(0, Math.min(maxNum, numValue));
          const newNumbers = [...selectedNumbers];
          newNumbers[index] = validValue;
          setSelectedNumbers(newNumbers);
          setInputText(formatNumber(validValue, gameType));
        } else {
          // Invalid input - revert
          setInputText(formatNumber(currentValue, gameType));
        }
      }
    };

    // Only sync when game changes, not on value changes
    useEffect(() => {
      setInputText(formatNumber(currentValue, gameType));
    }, [gameType, currentValue]);

    return (
      <View className="mx-1 mb-3 items-center" style={{ minWidth: 65 }}>
        <Text className="text-gray-700 font-medium mb-2 text-center text-sm">
          {gameType === "senp" ? t("number") : `#${index + 1}`}
        </Text>
        
        {/* Fixed Input Box */}
        <TextInput
          ref={(ref) => { inputRefs.current[index] = ref; }}
          value={inputText}
          onChangeText={handleNumberChange}
          onBlur={handleInputBlur}
          keyboardType="number-pad"
          maxLength={gameType.startsWith("loto") ? 1 : 2}
          style={{
            backgroundColor: "#facc15",
            borderRadius: 12,
            width: 65,
            height: 65,
            textAlign: "center",
            fontSize: 26,
            fontWeight: "900",
            color: "#000000",
            borderWidth: 2,
            borderColor: "#d1d5db"
          }}
          placeholder={gameType.startsWith("loto") ? "0" : "00"}
          selectTextOnFocus={true}
        />
        
        {/* Show range */}
        <Text className="text-xs text-gray-500 mt-1">
          {gameType.startsWith("loto") ? "0-9" : "00-99"}
        </Text>
      </View>
    );
  };

  const generateNumberPickers = () => {
    const gameConfig = availableGames.find(g => g.key === selectedGame);
    if (!gameConfig) return null;

    const pickers = [];
    for (let i = 0; i < gameConfig.numbers; i++) {
      pickers.push(
        <NumberInput key={i} index={i} gameType={selectedGame} />
      );
    }
    
    return (
      <View className="flex-row justify-center items-center flex-wrap px-2">
        {pickers}
      </View>
    );
  };

  const addSelection = () => {
    const gameConfig = getGameConfig(selectedGame);
    const betAmountNum = parseFloat(betAmount);

    if (!betAmount || isNaN(betAmountNum)) {
      Alert.alert("Error", t("enterValidAmount"));
      return;
    }

    if (betAmountNum < gameConfig.min || betAmountNum > gameConfig.max) {
      Alert.alert("Error", `Bet amount must be between ${getCurrencySymbol()}${gameConfig.min} and ${getCurrencySymbol()}${gameConfig.max}`);
      return;
    }

    if (selectedNumbers.length === 0 || selectedNumbers.some(num => num === undefined)) {
      Alert.alert("Error", t("selectAllNumbers"));
      return;
    }

    // VALIDATION 0: Check if vendor has stopped sales for any of these numbers
    const stoppedNumbers = vendor.draws[selectedState]?.stoppedNumbers || [];
    for (const number of selectedNumbers) {
      const formattedNumber = number.toString().padStart(2, '0');
      if (stoppedNumbers.includes(formattedNumber)) {
        Alert.alert(
          "Sales Stopped",
          `The vendor has stopped accepting bets on number ${formattedNumber}. Please choose a different number.`,
          [{ text: "OK" }]
        );
        return;
      }
    }

    // VALIDATION 1: Check if player has already bet on any of these numbers in this state
    for (const number of selectedNumbers) {
      if (hasPlayerBetOnNumber(number, selectedState)) {
        const formattedNumber = number.toString().padStart(2, '0');
        Alert.alert(
          "Duplicate Bet Not Allowed",
          `You have already placed a bet on number ${formattedNumber} for ${selectedState}. You cannot bet on the same number more than once in one state.`,
          [{ text: "OK" }]
        );
        return;
      }
    }

    // VALIDATION 2: Check if bet would exceed vendor's number limit
    const limitCheck = wouldExceedNumberLimit(selectedNumbers, betAmountNum, selectedState);
    if (limitCheck.exceeded) {
      const formattedNumber = limitCheck.number?.toString().padStart(2, '0');
      Alert.alert(
        "Bet Limit Exceeded",
        `Number ${formattedNumber} has reached its betting limit.\n\nLimit: ${getCurrencySymbol()}${limitCheck.limit}\nRemaining capacity: ${getCurrencySymbol()}${limitCheck.remaining?.toFixed(2)}\n\nPlease reduce your bet amount to ${getCurrencySymbol()}${limitCheck.remaining?.toFixed(2)} or less for this number.`,
        [{ text: "OK" }]
      );
      return;
    }

    const selection = {
      id: Date.now().toString(),
      state: selectedState,
      gameType: selectedGame.toUpperCase(),
      numbers: [...selectedNumbers],
      betAmount: betAmountNum,
      currency,
    };

    setGameSelections([...gameSelections, selection]);
    setSelectedNumbers([]);
    setBetAmount("");
    Alert.alert("Success", t("selectionAdded"));
  };

  const removeSelection = (id: string) => {
    setGameSelections(gameSelections.filter(s => s.id !== id));
  };

  const getTotalBet = () => {
    return gameSelections.reduce((total, selection) => total + selection.betAmount, 0);
  };

  const proceedToPayment = () => {
    if (gameSelections.length === 0) {
      Alert.alert("Error", "Please add at least one selection");
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Total: ${getCurrencySymbol()}${getTotalBet()}\nProceed to payment?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Pay Now", onPress: () => {
          setShowPaymentModal(true);
        }}
      ]
    );
  };

  const completePurchase = () => {
    // Save each selection as a game play
    gameSelections.forEach(selection => {
      const gamePlay = {
        id: `${Date.now()}-${selection.id}`,
        playerId: user?.id || "player1",
        vendorId: vendor.id,
        draw: selection.state as any,
        gameType: selection.gameType.toLowerCase() as any,
        numbers: selection.numbers,
        betAmount: selection.betAmount,
        currency: selection.currency as any,
        timestamp: Date.now(),
        status: "pending" as const,
      };
      
      addGamePlay(gamePlay);
    });

    // Show success message and navigate back
    Alert.alert(
      "Purchase Successful! 🎉",
      `${gameSelections.length} bet(s) placed for ${getCurrencySymbol()}${getTotalBet()}\n\nYour numbers are now in play. Good luck!`,
      [
        {
          text: "Rate Vendor ⭐",
          onPress: () => {
            (navigation as any).navigate("VendorRating", { 
              vendor, 
              gamePlay: gameSelections[0] // Pass first game for context
            });
          }
        },
        {
          text: "View History",
          onPress: () => {
            navigation.navigate("HistoryScreen" as never);
          }
        },
        {
          text: "Place More Bets",
          style: "cancel",
          onPress: () => {
            setGameSelections([]);
            setSelectedNumbers([]);
            setBetAmount("");
          }
        }
      ]
    );
  };

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-yellow-600">
              GROLOTTO
            </Text>
            <Text className="text-xl font-bold text-gray-800">
              {vendor.displayName || `${vendor.firstName} ${vendor.lastName}`}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text className="text-yellow-600 font-medium ml-1">
                {vendor.rating}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {/* State Selection */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-3">
              {t("selectState")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {enabledStates.map((state: string) => (
                  <Pressable
                    key={state}
                    onPress={() => setSelectedState(state)}
                    className={`px-6 py-3 rounded-xl border-2 ${
                      selectedState === state
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selectedState === state ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      {state}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Game Type Selection */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-3">
              {t("selectGameType")}
            </Text>
            <View className="space-y-2">
              {availableGames.map((game) => {
                const config = getGameConfig(game.key);
                return (
                  <Pressable
                    key={game.key}
                    onPress={() => {
                      setSelectedGame(game.key);
                      setSelectedNumbers([]);
                      setBetAmount("");
                      inputRefs.current = [];
                    }}
                    className={`p-3 rounded-xl border flex-row items-center justify-between ${
                      selectedGame === game.key
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-lg font-bold ${
                          selectedGame === game.key ? "text-green-600" : "text-gray-800"
                        }`}
                      >
                        {game.name}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        {game.description}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        Range: {getCurrencySymbol()}{config.min} - {getCurrencySymbol()}{config.max}
                      </Text>
                    </View>
                    {selectedGame === game.key && (
                      <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Number Selection */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-3">
              {t("selectNumbers")}
            </Text>
            {generateNumberPickers()}
          </View>

          {/* Bet Amount */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
            <Text className="text-xl font-bold text-gray-800 mb-3">
              {t("betAmount")}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-700 mr-2">
                {getCurrencySymbol()}
              </Text>
              <TextInput
                value={betAmount}
                onChangeText={setBetAmount}
                placeholder="0"
                keyboardType="numeric"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-xl font-medium bg-white"
              />
            </View>
            {selectedGame && (
              <Text className="text-gray-500 text-sm mt-2">
                Min: {getCurrencySymbol()}{getGameConfig(selectedGame).min} •
                Max: {getCurrencySymbol()}{getGameConfig(selectedGame).max}
              </Text>
            )}
          </View>

          {/* Number Limit Warning - Show if any selected number has a limit */}
          {selectedNumbers.length > 0 && selectedNumbers.every(n => n !== undefined) && (() => {
            const numbersWithLimits = selectedNumbers.map(num => {
              const limit = getNumberLimit(num, selectedState);
              if (limit !== null) {
                const currentTotal = getTotalBetsOnNumber(num, selectedState);
                const remaining = limit - currentTotal;
                return {
                  number: num,
                  limit,
                  remaining: Math.max(0, remaining),
                  percentUsed: (currentTotal / limit) * 100
                };
              }
              return null;
            }).filter(Boolean);

            if (numbersWithLimits.length > 0) {
              return (
                <View className="bg-orange-50 rounded-2xl p-4 mb-6 border-2 border-orange-200">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="warning" size={20} color="#f97316" />
                    <Text className="text-orange-800 font-bold text-base ml-2">
                      Bet Limits Active
                    </Text>
                  </View>
                  <Text className="text-orange-700 text-sm mb-3">
                    The following numbers have betting limits set by the vendor:
                  </Text>
                  {numbersWithLimits.map((info: any, index: number) => {
                    const isNearLimit = info.percentUsed >= 80;
                    const isAtLimit = info.remaining <= 0;
                    return (
                      <View key={index} className="mb-2 bg-white rounded-lg p-3 border border-orange-200">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="font-bold text-gray-800">
                            Number {info.number.toString().padStart(2, '0')}
                          </Text>
                          <Text className={`font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'}`}>
                            {isAtLimit ? 'LIMIT REACHED' : `${getCurrencySymbol()}${info.remaining.toFixed(2)} remaining`}
                          </Text>
                        </View>
                        <View className="bg-gray-200 h-2 rounded-full overflow-hidden">
                          <View
                            className={`h-full ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(info.percentUsed, 100)}%` }}
                          />
                        </View>
                        <Text className="text-xs text-gray-600 mt-1">
                          Limit: {getCurrencySymbol()}{info.limit} • {info.percentUsed.toFixed(0)}% used
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            }
            return null;
          })()}

          {/* Add Selection Button */}
          <Pressable
            onPress={addSelection}
            className="bg-blue-600 rounded-2xl py-4 px-6 mb-6"
          >
            <Text className="text-white text-center font-bold text-lg">
              {t("addSelection")}
            </Text>
          </Pressable>

          {/* Current Selections */}
          {gameSelections.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
              <Text className="text-xl font-bold text-gray-800 mb-3">
                {t("yourSelections")} ({gameSelections.length})
              </Text>
              {gameSelections.map((selection) => (
                <View
                  key={selection.id}
                  className="flex-row items-center justify-between p-3 border border-gray-200 rounded-xl mb-2"
                >
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800">
                      {selection.gameType} - {selection.state}
                    </Text>
                     <Text className="text-gray-600">
                       Numbers: {selection.numbers.map((n: number) => 
                         formatNumber(n, selection.gameType.toLowerCase())
                       ).join("-")}
                     </Text>
                    <Text className="text-green-600 font-medium">
                      {getCurrencySymbol()}{selection.betAmount}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeSelection(selection.id)}
                    className="bg-red-100 rounded-full p-2"
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </Pressable>
                </View>
              ))}
              
              <View className="border-t border-gray-200 pt-3 mt-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xl font-bold text-gray-800">
                    {t("total")}:
                  </Text>
                  <Text className="text-2xl font-bold text-green-600">
                    {getCurrencySymbol()}{getTotalBet()}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {gameSelections.length > 0 && (
        <View className="bg-white p-6 border-t border-gray-200">
          <Pressable
            onPress={proceedToPayment}
            className="bg-green-600 rounded-2xl py-4 px-6"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="card-outline" size={24} color="white" />
              <Text className="text-white text-center font-bold text-lg ml-2">
                Pay {getCurrencySymbol()}{getTotalBet()}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Payment Modal */}
      <PaymentModal 
        visible={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          completePurchase();
        }}
        amount={getTotalBet()}
      />
     </SafeAreaView>
    </GestureHandlerRootView>
   );
}